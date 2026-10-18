// ⚠ 이 import 가 게이트다. DB 자격증명을 다루는 모듈은 클라이언트 번들로 새면 빌드가 깨져야 한다.
import "server-only";

import { Effect, Layer } from "effect";

import type { Conversation, Message } from "@hathway/agents/domain/Conversation";
import { ConversationStore, ConversationStoreError } from "@hathway/agents/ports/ConversationStore";

import type { SqlExecutor } from "../connection.ts";

/**
 * `ConversationStore` 의 Postgres 구현. `agent.conversation` 과 `agent.message` 를 읽고 쓴다.
 *
 * ⚠ **`OPENABLE` 은 `canOpenConversation` 을 SQL 로 옮긴 것이다**(INV-AGENT-01). 연 사람이고 같은 테넌트다.
 *    둘이 같은 집합을 내는지는 계약 테스트가 잰다(`@hathway/agents/testing/contracts/conversation-store`).
 * ⚠ **말을 적는 쓰기는 멱등이다**(INV-AGENT-03). `on conflict do nothing` 이 다시 돈 스텝의 같은 key 를
 *    한 줄로 접는다. 유일 제약이 그 성질을 지키고 이 문장은 그것에 기댄다.
 * ⚠ **여는 쓰기도 멱등이다.** 실행을 건 요청이 다시 와도 먼저 적힌 줄이 남는다.
 */
type ConversationRow =
{
    id: string;
    tenant_id: string;
    started_by: string;
    title: string;
    status: "open" | "closed";
    started_at: Date;
};

type MessageRow =
{
    id: string;
    conversation_id: string;
    role: "user" | "assistant";
    text: string;
    created_at: Date;
};

const COLUMNS = "id, tenant_id, started_by, title, status, started_at";

/** `$1` 은 행위자의 계정, `$2` 는 행위자의 테넌트다 */
const OPENABLE = "started_by = $1::bigint and tenant_id = $2::bigint";

const OPEN = `
    insert into agent.conversation (id, tenant_id, started_by, title)
    values ($1, $2::bigint, $3::bigint, $4)
    on conflict (id) do nothing
`;

const APPEND = `
    insert into agent.message (conversation_id, key, role, text)
    values ($1, $2, $3, $4)
    on conflict (conversation_id, key) do nothing
`;

const CLOSE = `
    update agent.conversation
       set status = 'closed', closed_at = now()
     where id = $1 and status = 'open'
`;

const LIST = `select ${COLUMNS} from agent.conversation where ${OPENABLE} order by started_at desc, id desc`;

const FIND = `select ${COLUMNS} from agent.conversation where ${OPENABLE} and id = $3`;

/** 열 수 있는 대화의 말만 읽는다. 같은 조건을 조인으로 한 번 더 건다 */
const TRANSCRIPT = `
    select m.id, m.conversation_id, m.role, m.text, m.created_at
      from agent.message m
      join agent.conversation c on c.id = m.conversation_id
     where c.started_by = $1::bigint and c.tenant_id = $2::bigint and c.id = $3
     order by m.id
`;

const conversationOf = (row: ConversationRow): Conversation => ({
    id: row.id,
    tenantId: row.tenant_id,
    startedBy: row.started_by,
    title: row.title,
    status: row.status,
    startedAt: row.started_at.toISOString(),
});

const messageOf = (row: MessageRow): Message => ({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    text: row.text,
    createdAt: row.created_at.toISOString(),
});

const failure = (operation: string) =>
    (cause: unknown): ConversationStoreError =>
        new ConversationStoreError({ message: `대화 ${operation} 실패: ${String(cause)}` });

export const conversationStorePostgresLayer = (sql: SqlExecutor): Layer.Layer<ConversationStore> =>
    Layer.succeed(ConversationStore, ConversationStore.of({
        open: ({ id, tenantId, startedBy, title }) =>
            Effect.tryPromise({
                try: () => sql.query(OPEN, [id, tenantId, startedBy, title]),
                catch: failure("열기"),
            }).pipe(Effect.asVoid),

        append: ({ conversationId, key, role, text }) =>
            Effect.tryPromise({
                try: () => sql.query(APPEND, [conversationId, key, role, text]),
                catch: failure("적기"),
            }).pipe(Effect.asVoid),

        close: (conversationId) =>
            Effect.tryPromise({
                try: () => sql.query(CLOSE, [conversationId]),
                catch: failure("닫기"),
            }).pipe(Effect.asVoid),

        listFor: (actor) =>
            Effect.tryPromise({
                try: () => sql.query<ConversationRow>(LIST, [actor.accountId, actor.tenantId]),
                catch: failure("목록"),
            }).pipe(Effect.map((result) => result.rows.map(conversationOf))),

        findFor: (actor, conversationId) =>
            Effect.tryPromise({
                try: () => sql.query<ConversationRow>(FIND, [actor.accountId, actor.tenantId, conversationId]),
                catch: failure("찾기"),
            }).pipe(Effect.map((result) =>
            {
                const row = result.rows[0];

                return row === undefined ? null : conversationOf(row);
            })),

        transcript: (actor, conversationId) =>
            Effect.tryPromise({
                try: () => sql.query<MessageRow>(TRANSCRIPT, [actor.accountId, actor.tenantId, conversationId]),
                catch: failure("말 읽기"),
            }).pipe(Effect.map((result) => result.rows.map(messageOf))),
    }));

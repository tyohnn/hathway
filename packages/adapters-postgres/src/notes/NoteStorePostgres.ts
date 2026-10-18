// ⚠ 이 import 가 게이트다. DB 자격증명을 다루는 모듈은 클라이언트 번들로 새면 빌드가 깨져야 한다.
import "server-only";

import { Effect, Layer } from "effect";

import type { Note } from "@hathway/notes/domain/Note";
import type { NotePage } from "@hathway/notes/domain/NoteQuery";
import { NoteStore, NoteStoreError, type ArchiveOutcome } from "@hathway/notes/ports/NoteStore";

import type { SqlExecutor } from "../connection.ts";

/**
 * `NoteStore` 의 Postgres 구현. `notes.note` 를 읽고 쓴다.
 *
 * ⚠ **`VISIBLE` 은 `canSeeNote` 를 SQL 로 옮긴 것이다**(INV-NOTE-01). 같은 테넌트이고, 공개이거나 쓴 사람이다.
 *    술어를 고치면 이 조각도 함께 고치고, 둘이 같은 집합을 내는지는 계약 테스트가 잰다
 *    (`@hathway/notes/testing/contracts/note-store`).
 * ⚠ **값은 전부 `$n` 파라미터다.** 템플릿의 `${}` 에는 모듈 상수 조각만 넣는다.
 * ⚠ **찾는 말은 `like` 의 기호를 글자로 바꿔 넣는다**(`likePattern`). 그대로 넣으면 `%` 하나로 모든 쪽지가 맞는다. 판정을 넘지는
 *    않지만(`VISIBLE` 이 함께 걸린다) 찾기가 사람이 친 글자와 다르게 돈다.
 * ⚠ **한 쪽과 총수는 두 문장이다.** 끝을 넘은 쪽은 줄이 없어서 `count(*) over ()` 로는 총수를 얻지 못한다. 두 문장 사이에 쪽지가
 *    늘면 총수가 하나 어긋날 수 있고, 목록 화면에는 그 정도가 맞다.
 * ⚠ **보관은 조건부 한 문장이다.** 판정(`archiveVerdict`)과 이 쓰기 사이에 다른 요청이 끼어들 수 있으므로
 *    쓴 사람과 판과 상태를 `where` 에 다시 건다. 0줄이면 `conflict` 다. 미리 `select` 로 보고 쓰지 않는
 *    것은 그 틈 때문이다.
 */
type NoteRow =
{
    id: string;
    tenant_id: string;
    author_id: string;
    title: string;
    body: string;
    visibility: "private" | "tenant";
    status: "active" | "archived";
    version: number;
    created_at: Date;
};

const COLUMNS = "id, tenant_id, author_id, title, body, visibility, status, version, created_at";

/** `$1` 은 행위자의 테넌트, `$2` 는 행위자의 계정이다 */
const VISIBLE = "tenant_id = $1::bigint and (visibility = 'tenant' or author_id = $2::bigint)";

const LIST = `select ${COLUMNS} from notes.note where ${VISIBLE} order by id desc`;

/** `$3` 은 `likePattern` 을 지난 찾는 말이다. 찾는 말이 없으면 `%%` 라 모두 맞는다 */
const MATCHED = `${VISIBLE} and title ilike $3 escape '\\'`;

const PAGE = `select ${COLUMNS} from notes.note where ${MATCHED} order by id desc limit $4 offset $5`;

const COUNT = `select count(*)::int as total from notes.note where ${MATCHED}`;

const FIND = `select ${COLUMNS} from notes.note where ${VISIBLE} and id = $3::bigint`;

const INSERT = `
    insert into notes.note (tenant_id, author_id, title, body, visibility)
    values ($1::bigint, $2::bigint, $3, $4, $5)
    returning ${COLUMNS}
`;

const ARCHIVE = `
    update notes.note
       set status = 'archived', version = version + 1, updated_at = now()
     where id = $1::bigint
       and author_id = $2::bigint
       and version = $3
       and status = 'active'
`;

const noteOf = (row: NoteRow): Note => ({
    id: row.id,
    tenantId: row.tenant_id,
    authorId: row.author_id,
    title: row.title,
    body: row.body,
    visibility: row.visibility,
    status: row.status,
    version: row.version,
    createdAt: row.created_at.toISOString(),
});

const failure = (operation: string) =>
    (cause: unknown): NoteStoreError => new NoteStoreError({ message: `쪽지 ${operation} 실패: ${String(cause)}` });

/** 찾는 말을 `ilike` 의 무늬로 바꾼다. 역슬래시 · `%` · `_` 는 앞에 역슬래시를 달아 글자로 읽힌다 */
const likePattern = (q: string): string => `%${q.replace(/[\\%_]/g, "\\$&")}%`;

/** 숫자가 아닌 id 는 질의에 넣지 않는다. 캐스팅 오류가 「없는 쪽지」를 조회 실패로 보이게 한다 */
const isId = (value: string): boolean => /^\d+$/.test(value);

export const noteStorePostgresLayer = (sql: SqlExecutor): Layer.Layer<NoteStore> =>
    Layer.succeed(NoteStore, NoteStore.of({
        listVisible: (actor) =>
            Effect.tryPromise({
                try: () => sql.query<NoteRow>(LIST, [actor.tenantId, actor.accountId]),
                catch: failure("목록"),
            }).pipe(Effect.map((result) => result.rows.map(noteOf))),

        listPage: (actor, { q, page, pageSize }) =>
        {
            const scope = [actor.tenantId, actor.accountId, likePattern(q)];

            return Effect.tryPromise({
                try: () => Promise.all([
                    sql.query<NoteRow>(PAGE, [...scope, pageSize, (page - 1) * pageSize]),
                    sql.query<{ total: number }>(COUNT, scope),
                ]),
                catch: failure("쪽"),
            }).pipe(Effect.map(([rows, count]): NotePage => ({
                notes: rows.rows.map(noteOf),
                total: count.rows[0]?.total ?? 0,
            })));
        },

        findVisible: (actor, noteId) =>
            !isId(noteId)
                ? Effect.succeed(null)
                : Effect.tryPromise({
                    try: () => sql.query<NoteRow>(FIND, [actor.tenantId, actor.accountId, noteId]),
                    catch: failure("찾기"),
                }).pipe(Effect.map((result) =>
                {
                    const row = result.rows[0];

                    return row === undefined ? null : noteOf(row);
                })),

        create: (note) =>
            Effect.tryPromise({
                try: () => sql.query<NoteRow>(INSERT, [note.tenantId, note.authorId, note.title, note.body, note.visibility]),
                catch: failure("쓰기"),
            }).pipe(Effect.flatMap((result) =>
            {
                const row = result.rows[0];

                return row === undefined
                    ? Effect.fail(new NoteStoreError({ message: "쪽지 쓰기가 행을 돌려주지 않았다" }))
                    : Effect.succeed(noteOf(row));
            })),

        archive: ({ noteId, authorId, expectedVersion }) =>
            !isId(noteId)
                ? Effect.succeed<ArchiveOutcome>("conflict")
                : Effect.tryPromise({
                    try: () => sql.query(ARCHIVE, [noteId, authorId, expectedVersion]),
                    catch: failure("보관"),
                }).pipe(Effect.map((result): ArchiveOutcome => (result.rowCount === 1 ? "archived" : "conflict"))),
    }));

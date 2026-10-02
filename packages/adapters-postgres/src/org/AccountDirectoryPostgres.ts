// ⚠ 이 import 가 게이트다. DB 자격증명을 다루는 모듈은 클라이언트 번들로 새면 빌드가 깨져야 한다.
import "server-only";

import { Effect, Layer } from "effect";

import type { LinkableAccount } from "@investment/access/access/accountLink";
import { AccountDirectory, type LinkOutcome } from "@investment/access/ports/AccountDirectory";
import { NotAppMember } from "@investment/access/ports/ActorResolver";

import type { SqlExecutor } from "../connection.ts";

import { lookupMembershipsByUserId } from "./MembershipLookupPostgres.ts";

/**
 * `AccountDirectory` 의 Postgres 구현이고 `org.account` 를 읽고 한 칸을 쓴다.
 *
 * ⚠ **앱 롤마다 같은 코드로 돈다.** 앱의 롤은 `org.account` 에서 `auth_user_id` 한 칸의 UPDATE 만
 *    받았다(`*_create_org_schema.sql`). 여기서 다른 칸을 쓰면 배포에서 permission denied 로 드러난다.
 * ⚠ **잇는 문장이 판정을 한 번 더 한다.** 칸이 비어 있고 주소가 같고 나간 계정이 아닐 때만 한 줄을
 *    바꾼다(INV-ACCESS-08). 보고 나서 쓰는 사이에 다른 세션이 붙었거나 주소가 바뀌었으면 0줄이고
 *    `not_linked` 로 답한다. 미리 `select` 로 보고 쓰지 않는 것은 그 틈 때문이다.
 * ⚠ **이 세션이 이미 다른 계정에 붙어 있으면 유일 제약이 거절한다.** 그 거절만 결과로 접고 다른
 *    오류는 조회 실패로 둔다. 500 으로 새면 로그인한 사람이 오류 화면을 받는다.
 */
type LinkableRow =
{
    id: string;
    auth_user_id: string | null;
    deactivated: boolean;
};

const BY_EMAIL = `
    select id, auth_user_id, (deactivated_at is not null) as deactivated
      from org.account
     where lower(email) = lower($1)
`;

const LINK = `
    update org.account
       set auth_user_id = $2::uuid
     where id = $1::bigint
       and auth_user_id is null
       and deactivated_at is null
       and lower(email) = $3
`;

/** 이 세션이 이미 다른 계정에 붙어 있어 유일 제약이 거절한 것인가. 다른 `23505` 는 삼키지 않는다 */
const sessionTaken = (cause: unknown): boolean =>
    typeof cause === "object"
    && cause !== null
    && (cause as { code?: unknown }).code === "23505"
    && (cause as { constraint?: unknown }).constraint === "account_auth_user_id_key";

const failure = (operation: string) =>
    (cause: unknown): NotAppMember =>
        new NotAppMember({ reason: `${operation} 실패: ${String(cause)}` });

export const accountDirectoryPostgresLayer = (sql: SqlExecutor): Layer.Layer<AccountDirectory> =>
    Layer.succeed(AccountDirectory, AccountDirectory.of({
        factsBySession: (authUserId) => lookupMembershipsByUserId(sql, authUserId),

        linkableByEmail: (email) =>
            Effect.tryPromise({
                try: () => sql.query<LinkableRow>(BY_EMAIL, [email]),
                catch: failure("주소로 계정 조회"),
            }).pipe(Effect.map((result): LinkableAccount | null =>
            {
                const row = result.rows[0];

                return row === undefined
                    ? null
                    : { accountId: String(row.id), authUserId: row.auth_user_id, deactivated: row.deactivated };
            })),

        link: (request) =>
            Effect.tryPromise({
                try: () => sql.query(LINK, [request.accountId, request.authUserId, request.email]),
                catch: (cause) => cause,
            }).pipe(
                Effect.map((result): LinkOutcome => (result.rowCount === 1 ? "linked" : "not_linked")),
                Effect.catch((cause) =>
                    sessionTaken(cause)
                        ? Effect.succeed<LinkOutcome>("session_taken")
                        : Effect.fail(failure("계정에 세션 잇기")(cause))),
            ),
    }));

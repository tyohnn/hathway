// ⚠ 이 import 가 게이트다. DB 자격증명을 다루는 모듈은 클라이언트 번들로 새면 빌드가 깨져야 한다.
import "server-only";

import { Effect } from "effect";

import type { AccountFacts, TenantMembership } from "@investment/access/access/membership";
import { NotAppMember } from "@investment/access/ports/ActorResolver";
import { TENANT_KINDS, type TenantKind } from "@investment/shared/constants/tenancy";

import type { SqlExecutor } from "../connection.ts";

/**
 * 세션의 `auth.users.id` 로 **소속 사실을 읽는다**. 행위자를 확정하는 둘째 계층인 소속이다.
 *
 * ⚠ **이 파일이 `src/org/` 에 있는 까닭**은 앱이 늘어도 모두 이 함수를 부르기 때문이다. 사람은 어느
 *    도메인의 것도 아니라 도메인을 가로지르는 기준 정보이고, 표도 `org` 에 있다.
 *
 * ⚠ **판정하지 않는다.** 이 앱을 쓸 수 있는 사람인지는 `@investment/access` 의 `canEnterApp` 이 정하고,
 *    여기서는 계정 한 행과 그 계정의 멤버십 전부를 사실 그대로 읽어 올린다. 여러 앱이 같은 표를 읽고
 *    서로 다른 답을 내야 하므로 판정이 어댑터에 있으면 앱마다 그 답을 다시 쓰게 된다.
 *
 * ⚠ **앱이 조회를 고르지 않는다.** 계정과 멤버십을 한 번에 읽는 함수가 이것 하나뿐이다.
 *
 * ⚠ **권한 축을 세션에서 읽지 않는다.** 역할은 서버가 `org` 에서 읽은 값이어야
 *    한다. JWT 클레임을 믿으면 토큰을 쥔 사람이 자기 권한을 적어 넣는 것과 같다.
 *
 * ⚠ **멤버십이 없는 계정도 사실로 올린다.** 행이 없다는 것과 조회가 실패한 것은 다르고, 문을 닫는 것은
 *    `canEnterApp` 이다. 다만 **계정 자체가 없으면** 올릴 사실이 없으므로 그때는 실패로 답한다.
 */
type MembershipRow =
{
    account_id: string;
    deactivated: boolean;
    membership_id: string | null;
    tenant_id: string | null;
    tenant_kind: string | null;
    tenant_active: boolean | null;
    role: string | null;
    membership_active: boolean | null;
};

/**
 * 계정 한 행과 그 계정의 멤버십 전부를 한 번에 읽는다.
 *
 * 멤버십이 없는 계정은 왼쪽 조인 때문에 한 행이 오고 그 행의 멤버십 칸이 전부 `null` 이다. 그래서
 * 행 수로 판정하지 않고 `membership_id` 가 있는 것만 모은다.
 */
const SELECT = `
    select a.id                           as account_id,
           (a.deactivated_at is not null) as deactivated,
           m.id                           as membership_id,
           m.tenant_id                    as tenant_id,
           t.kind                         as tenant_kind,
           t.active                       as tenant_active,
           m.role                         as role,
           m.active                       as membership_active
      from org.account a
      left join org.membership m on m.account_id = a.id
      left join org.tenant     t on t.id = m.tenant_id
`;

/** 세션으로 들어오는 사람은 `auth.users.id` 를 들고 온다 */
const BY_AUTH_USER = `${SELECT} where a.auth_user_id = $1::uuid order by m.id`;

/**
 * 우리가 발급한 토큰은 `org.account.id` 를 가리킨다.
 *
 * ⚠ **돌려주는 사실과 없을 때의 답이 위와 같아야 한다.** 같은 사람이 어느 문으로 들어오느냐에 따라
 *    다른 답을 받으면 안 된다.
 */
const BY_ACCOUNT = `${SELECT} where a.id = $1::bigint order by m.id`;

/**
 * 로그인하려는 사람이 적어 넣은 주소로 읽는다. **세션이 아직 없는 자리다.**
 *
 * 운영이 먼저 세워 둔 사람에게는 `org.account` 행 하나만 있고
 * `auth.users` 행이 아직 없으므로, 위의 두 질의로는 그 사람을 찾을 방법이 없다.
 *
 * ⚠ **돌려주는 사실과 없을 때의 답이 위의 둘과 같아야 한다.** 같은 사람이 어느 키로 들어오든 같은
 *    답을 받아야 문이 하나다.
 * ⚠ **대소문자를 무시하고 대조한다.** `org.account` 에 `lower(email)` 유일 인덱스가 서 있어
 *    대문자만 다른 두 계정이 서지 못하므로 이 조회가 한 사람을 고른다. 그 인덱스가 없으면 같은
 *    질의가 두 계정의 멤버십을 한 사람의 것으로 읽고, 그 사람은 남의 회사 문을 지난다.
 */
const BY_EMAIL = `${SELECT} where lower(a.email) = lower($1) order by m.id`;

const TENANT_KIND_BY_VALUE = new Map<string, TenantKind>(TENANT_KINDS.map((kind) => [kind, kind]));

/**
 * 한 행을 멤버십 하나로 접는다. 접을 수 없으면 `null` 이고 그 행은 버려진다.
 *
 * ⚠ **모르는 종류와 모르는 역할은 없는 것으로 다룬다.** 표의 CHECK 가 막고 있지만, 그 CHECK 를
 *    넓히고 이 코드를 고치지 않은 날에는 문이 조용히 열리는 대신 닫힌 채로 드러나야 한다.
 */
const membershipOf = (row: MembershipRow): TenantMembership | null =>
{
    const kind = row.tenant_kind === null ? undefined : TENANT_KIND_BY_VALUE.get(row.tenant_kind);

    if (row.membership_id === null || row.tenant_id === null || kind === undefined || row.role === null)
    {
        return null;
    }

    if (row.role !== "owner" && row.role !== "admin" && row.role !== "member")
    {
        return null;
    }

    return {
        membershipId: row.membership_id,
        tenantId: row.tenant_id,
        tenantKind: kind,
        tenantActive: row.tenant_active === true,
        role: row.role,
        active: row.membership_active === true,
    };
};

/** 계정이 없으면 `null` 이다. 조회가 깨진 것만 실패로 답한다 */
const maybeFactsOf = (
    sql: SqlExecutor,
    statement: string,
    value: string,
): Effect.Effect<AccountFacts | null, NotAppMember> =>
    Effect.tryPromise({
        try: () => sql.query<MembershipRow>(statement, [value]),
        catch: (cause) => new NotAppMember({ reason: `행위자 조회 실패: ${String(cause)}` }),
    }).pipe(Effect.map((result) =>
    {
        const first = result.rows[0];

        if (first === undefined)
        {
            return null;
        }

        const memberships = result.rows
            .map(membershipOf)
            .filter((membership): membership is TenantMembership => membership !== null);

        return { accountId: first.account_id, deactivated: first.deactivated, memberships };
    }));

const factsOf = (
    sql: SqlExecutor,
    statement: string,
    value: string,
): Effect.Effect<AccountFacts, NotAppMember> =>
    maybeFactsOf(sql, statement, value).pipe(Effect.flatMap((facts) =>
        facts === null
            ? Effect.fail(new NotAppMember({ reason: "org.account 에 이 계정의 행이 없다" }))
            : Effect.succeed(facts)));

export const findMembershipsByUserId = (
    sql: SqlExecutor,
    authUserId: string,
): Effect.Effect<AccountFacts, NotAppMember> =>
    factsOf(sql, BY_AUTH_USER, authUserId);

/**
 * 세션으로 같은 사실을 읽되, 붙은 계정이 없으면 `null` 로 답한다. 첫 로그인에 잇는 자리가 부른다
 * (`AccountDirectoryPostgres`). 없는 것이 실패가 아니어야 그다음에 주소로 찾을 수 있다.
 */
export const lookupMembershipsByUserId = (
    sql: SqlExecutor,
    authUserId: string,
): Effect.Effect<AccountFacts | null, NotAppMember> =>
    maybeFactsOf(sql, BY_AUTH_USER, authUserId);

/**
 * 계정 id 로 같은 사실을 읽는다. 세션이 없는 자리(워크플로의 스텝)가 행위자를 다시 세울 때 부른다.
 *
 * ⚠ **숫자가 아닌 값은 질의에 넣지 않는다.** `::bigint` 캐스팅이 오류를 내면 「없는 사람」이 조회
 *    실패로 보이는데, 둘은 같은 답이어야 한다.
 */
export const findMembershipsByAccountId = (
    sql: SqlExecutor,
    accountId: string,
): Effect.Effect<AccountFacts, NotAppMember> =>
    !/^\d+$/.test(accountId)
        ? Effect.fail(new NotAppMember({ reason: "org.account 에 이 계정의 행이 없다" }))
        : factsOf(sql, BY_ACCOUNT, accountId);

/**
 * 이메일로 같은 사실을 읽는다. 로그인 링크를 보낼지 판정하는 자리가 부른다.
 *
 * ⚠ **이 함수는 판정하지 않는다.** 링크를 보낼지는 `canEnterApp` 이 이 사실을 받아 답한다
 *    (`docs/decisions/2026-09-18-로그인-링크는-명부에-있는-주소로만-보낸다.md`). 여기에 문을 여는
 *    조건을 적으면 술어가 두 벌이 된다.
 * ⚠ **부르기 전에 주소를 정규화한다.** `normalizeLoginEmail` 이 그 자리이고, 주소 꼴이 아닌 값은
 *    이 조회까지 오지 않는다.
 */
export const findMembershipsByEmail = (
    sql: SqlExecutor,
    email: string,
): Effect.Effect<AccountFacts, NotAppMember> =>
    factsOf(sql, BY_EMAIL, email);

// ⚠ 이 import 가 게이트다. DB 자격증명을 다루는 모듈은 클라이언트 번들로 새면 빌드가 깨져야 한다.
import "server-only";

import { Effect, Layer } from "effect";

import type { InviteTarget } from "@investment/access/access/team";
import type { MembershipRole } from "@investment/access/domain/AppAudience";
import { type AccountOrg, type MemberRow, TeamDirectory, TeamDirectoryError, type WriteOutcome } from "@investment/access/ports/TeamDirectory";

import type { SqlExecutor } from "../connection.ts";

/**
 * `TeamDirectory` 의 Postgres 구현. web 에서만 부르고 `web_app` 롤로 돈다(`*_grant_team_writes.sql`).
 *
 * ⚠ **쓰는 문장이 판정과 쓰기 사이의 틈을 막는다.** 역할은 바꾸기 전 역할일 때만, 끊기는 살아 있고 소유주가
 *    아닐 때만, 다시 잇기는 끊겨 있을 때만 한 줄을 바꾼다. 0줄이면 `conflict` 다. 미리 `select` 로 보고 쓰지 않는 것은
 *    그 틈 때문이다.
 * ⚠ **계정과 멤버십을 한 문장으로 세운다.** 계정이 서고 멤버십이 못 서면 테넌트 없는 계정이 남는다. 같은 주소가
 *    그사이 섰으면 `on conflict do nothing` 이 계정을 세우지 않고, 멤버십도 서지 않아 0줄이다.
 * ⚠ **숫자가 아닌 id 는 질의에 넣지 않는다.** `::bigint` 캐스팅 오류가 「없는 것」을 조회 실패로 바꾼다.
 */
type MemberRecord =
{
    membership_id: string;
    account_id: string;
    tenant_id: string;
    role: MembershipRole;
    email: string;
    name: string | null;
    pending: boolean;
};

const MEMBER_COLUMNS = `
    m.id as membership_id, m.account_id, m.tenant_id, m.role, a.email, a.name, (a.auth_user_id is null) as pending
      from org.membership m
      join org.account a on a.id = m.account_id and a.deactivated_at is null
`;

const LIST = `
    select ${MEMBER_COLUMNS}
     where m.tenant_id = $1::bigint and m.active
     order by case m.role when 'owner' then 0 when 'admin' then 1 else 2 end, m.id
`;

const FIND = `select ${MEMBER_COLUMNS} where m.tenant_id = $1::bigint and m.id = $2::bigint and m.active`;

const INVITE_TARGET = `
    select a.id as account_id, (a.deactivated_at is not null) as deactivated, m.id as membership_id, m.active
      from org.account a
      left join org.membership m on m.account_id = a.id and m.tenant_id = $1::bigint
     where lower(a.email) = $2
`;

const CREATE_MEMBER = `
    with account as (
        insert into org.account (email) values ($2) on conflict do nothing returning id
    )
    insert into org.membership (account_id, tenant_id, role)
    select id, $1::bigint, $3 from account
`;

const ADD_MEMBERSHIP = `
    insert into org.membership (account_id, tenant_id, role) values ($2::bigint, $1::bigint, $3)
    on conflict do nothing
`;

const REACTIVATE = "update org.membership set active = true, role = $2 where id = $1::bigint and not active";

const CHANGE_ROLE = "update org.membership set role = $3 where id = $1::bigint and active and role = $2";

const DEACTIVATE = "update org.membership set active = false where id = $1::bigint and active and role <> 'owner'";

const RENAME = "update org.account set name = $2 where id = $1::bigint";

const ACCOUNT_ORGS = `
    select t.id as tenant_id, t.name
      from org.membership m
      join org.tenant t on t.id = m.tenant_id and t.active
     where m.account_id = $1::bigint and m.active
     order by t.id
`;

const isId = (value: string): boolean => /^\d+$/.test(value);

const failure = (operation: string) =>
    (cause: unknown): TeamDirectoryError =>
        new TeamDirectoryError({ message: `${operation} 실패: ${String(cause)}` });

const rowOf = (record: MemberRecord): MemberRow => ({
    membershipId: String(record.membership_id),
    accountId: String(record.account_id),
    tenantId: String(record.tenant_id),
    role: record.role,
    email: record.email,
    name: record.name,
    pending: record.pending,
});

export const teamDirectoryPostgresLayer = (sql: SqlExecutor): Layer.Layer<TeamDirectory> =>
{
    const run = <R extends object = Record<string, unknown>>(operation: string, text: string, params: ReadonlyArray<unknown>) =>
        Effect.tryPromise({ try: () => sql.query<R>(text, [...params]), catch: failure(operation) });

    const write = (operation: string, text: string, params: ReadonlyArray<unknown>): Effect.Effect<WriteOutcome, TeamDirectoryError> =>
        run(operation, text, params).pipe(Effect.map((result) => (result.rowCount === 1 ? "done" : "conflict")));

    return Layer.succeed(TeamDirectory, TeamDirectory.of({
        listMembers: (tenantId) =>
            !isId(tenantId)
                ? Effect.succeed([])
                : run<MemberRecord>("팀 목록", LIST, [tenantId]).pipe(Effect.map((result) => result.rows.map(rowOf))),

        findMember: (tenantId, membershipId) =>
            !isId(tenantId) || !isId(membershipId)
                ? Effect.succeed(null)
                : run<MemberRecord>("멤버십 찾기", FIND, [tenantId, membershipId]).pipe(Effect.map((result) =>
                {
                    const record = result.rows[0];

                    return record === undefined ? null : rowOf(record);
                })),

        inviteTarget: (tenantId, email) =>
            !isId(tenantId)
                ? Effect.succeed(null)
                : run<{ account_id: string; deactivated: boolean; membership_id: string | null; active: boolean | null }>(
                    "초대할 주소 찾기",
                    INVITE_TARGET,
                    [tenantId, email],
                ).pipe(Effect.map((result): InviteTarget =>
                {
                    const record = result.rows[0];

                    if (record === undefined)
                    {
                        return null;
                    }

                    return {
                        accountId: String(record.account_id),
                        deactivated: record.deactivated,
                        membership: record.membership_id === null
                            ? null
                            : { membershipId: String(record.membership_id), active: record.active === true },
                    };
                })),

        createMember: ({ tenantId, email, role }) => write("계정과 멤버십 세우기", CREATE_MEMBER, [tenantId, email, role]),

        addMembership: ({ tenantId, accountId, role }) => write("멤버십 더하기", ADD_MEMBERSHIP, [tenantId, accountId, role]),

        reactivate: ({ membershipId, role }) =>
            !isId(membershipId) ? Effect.succeed("conflict") : write("멤버십 다시 잇기", REACTIVATE, [membershipId, role]),

        changeRole: ({ membershipId, from, to }) =>
            !isId(membershipId) ? Effect.succeed("conflict") : write("역할 바꾸기", CHANGE_ROLE, [membershipId, from, to]),

        deactivate: (membershipId) =>
            !isId(membershipId) ? Effect.succeed("conflict") : write("멤버십 끊기", DEACTIVATE, [membershipId]),

        accountOrgs: (accountId) =>
            !isId(accountId)
                ? Effect.succeed([])
                : run<{ tenant_id: string; name: string }>("조직 목록", ACCOUNT_ORGS, [accountId]).pipe(Effect.map((result) =>
                    result.rows.map((row): AccountOrg => ({ tenantId: String(row.tenant_id), name: row.name })))),

        rename: ({ accountId, name }) =>
            run("이름 바꾸기", RENAME, [accountId, name]).pipe(Effect.asVoid),
    }));
};

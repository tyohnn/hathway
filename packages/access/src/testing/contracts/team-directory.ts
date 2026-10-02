import { assert, describe, it } from "@effect/vitest";
import { Effect, type Layer } from "effect";

import type { MembershipRole } from "../../domain/AppAudience.ts";
import { TeamDirectory } from "../../ports/TeamDirectory.ts";

/**
 * 팀 명부의 계약. 메모리 구현과 Postgres 구현이 **같은 코드로** 돈다.
 *
 * ⚠ **검사마다 테넌트를 새로 세운다.** Postgres 는 로컬 시드와 여러 검사가 한 표를 함께 쓰고, 테넌트마다 소유주가
 *    하나라서 시드의 테넌트에 사람을 더하면 두 번째 실행부터 부딪친다. 주소도 검사마다 새로 짓는다.
 * ⚠ **같은 구현에 두 번 부르면 두 테넌트가 한 명부에 선다.** 다른 테넌트의 id 를 가리는지를 그렇게 잰다.
 */
export interface TeamSeedMember
{
    readonly email: string;
    readonly role: MembershipRole;
    readonly active?: boolean;
    readonly name?: string;
    /** 계정이 나갔다(`deactivated_at`) */
    readonly deactivated?: boolean;
    /** 로그인해서 세션이 이어졌다. 기본값은 이어진 것이다. `false` 면 초대만 받고 아직 들어오지 않은 사람이다 */
    readonly linked?: boolean;
}

export interface SeededTeam
{
    readonly layer: Layer.Layer<TeamDirectory>;
    readonly tenantId: string;
    /** 심은 차례 그대로 */
    readonly members: ReadonlyArray<{ readonly accountId: string; readonly membershipId: string }>;
}

export type MakeTeam = (members: ReadonlyArray<TeamSeedMember>) => Effect.Effect<SeededTeam>;

const freshEmail = (): string => `team-${crypto.randomUUID().slice(0, 8)}@example.test`;

const at = <T>(items: ReadonlyArray<T>, index: number): T =>
{
    const item = items[index];

    if (item === undefined)
    {
        throw new Error(`심은 사람이 ${index + 1}명보다 적다`);
    }

    return item;
};

export const teamDirectoryContract = (name: string, make: MakeTeam): void =>
{
    const within = <A, E>(team: SeededTeam, program: Effect.Effect<A, E, TeamDirectory>) =>
        program.pipe(Effect.provide(team.layer));

    describe(`팀 명부 (${name})`, () =>
    {
        it.effect("목록은 그 테넌트의 살아 있는 멤버십만, 소유주 · 관리자 · 구성원 차례로 온다", () =>
            Effect.gen(function*()
            {
                const team = yield* make([
                    { email: freshEmail(), role: "member" },
                    { email: freshEmail(), role: "admin" },
                    { email: freshEmail(), role: "owner" },
                    { email: freshEmail(), role: "member", active: false },
                ]);
                const rows = yield* within(team, Effect.flatMap(TeamDirectory, (directory) => directory.listMembers(team.tenantId)));

                assert.deepStrictEqual(rows.map((row) => row.role), ["owner", "admin", "member"]);
                assert.isTrue(rows.every((row) => row.tenantId === team.tenantId));
            }));

        it.effect("새로 세운 계정은 접은 주소로 찾히고 이 테넌트의 멤버십을 든다", () =>
            Effect.gen(function*()
            {
                const team = yield* make([{ email: freshEmail(), role: "owner" }]);
                const email = freshEmail();

                yield* within(team, Effect.gen(function*()
                {
                    const directory = yield* TeamDirectory;
                    const outcome = yield* directory.createMember({ tenantId: team.tenantId, email, role: "admin" });
                    const found = yield* directory.inviteTarget(team.tenantId, email);
                    const rows = yield* directory.listMembers(team.tenantId);

                    assert.strictEqual(outcome, "done");
                    assert.strictEqual(found?.deactivated, false);
                    assert.strictEqual(found?.membership?.active, true);
                    assert.deepInclude(rows.map((row) => ({ email: row.email, name: row.name, role: row.role })), { email, name: null, role: "admin" });
                }));
            }));

        it.effect("같은 주소를 두 번 세우면 두 번째는 부딪친다. 두 사람이 한 주소로 서지 않는다", () =>
            Effect.gen(function*()
            {
                const team = yield* make([{ email: freshEmail(), role: "owner" }]);
                const email = freshEmail();

                yield* within(team, Effect.gen(function*()
                {
                    const directory = yield* TeamDirectory;
                    const outcomes = yield* Effect.all([
                        directory.createMember({ tenantId: team.tenantId, email, role: "member" }),
                        directory.createMember({ tenantId: team.tenantId, email, role: "member" }),
                    ], { concurrency: "unbounded" });

                    assert.deepStrictEqual([...outcomes].sort(), ["conflict", "done"]);
                }));
            }));

        it.effect("다른 테넌트에 있는 계정에는 멤버십만 더한다", () =>
            Effect.gen(function*()
            {
                const email = freshEmail();
                const other = yield* make([{ email, role: "owner" }]);
                const team = yield* make([{ email: freshEmail(), role: "owner" }]);

                yield* within(team, Effect.gen(function*()
                {
                    const directory = yield* TeamDirectory;
                    const found = yield* directory.inviteTarget(team.tenantId, email);

                    assert.strictEqual(found?.accountId, at(other.members, 0).accountId);
                    assert.isNull(found?.membership);

                    const outcome = yield* directory.addMembership({ tenantId: team.tenantId, accountId: at(other.members, 0).accountId, role: "member" });
                    const rows = yield* directory.listMembers(team.tenantId);

                    assert.strictEqual(outcome, "done");
                    assert.include(rows.map((row) => row.email), email);
                }));
            }));

        it.effect("끊긴 멤버십을 다시 이으면 행이 늘지 않는다", () =>
            Effect.gen(function*()
            {
                const email = freshEmail();
                const team = yield* make([{ email: freshEmail(), role: "owner" }, { email, role: "member", active: false }]);
                const left = at(team.members, 1);

                yield* within(team, Effect.gen(function*()
                {
                    const directory = yield* TeamDirectory;
                    const found = yield* directory.inviteTarget(team.tenantId, email);

                    assert.deepStrictEqual(found?.membership, { membershipId: left.membershipId, active: false });

                    const outcome = yield* directory.reactivate({ membershipId: left.membershipId, role: "admin" });
                    const again = yield* directory.reactivate({ membershipId: left.membershipId, role: "admin" });
                    const rows = yield* directory.listMembers(team.tenantId);

                    assert.strictEqual(outcome, "done");
                    assert.strictEqual(again, "conflict");
                    assert.deepStrictEqual(
                        rows.filter((row) => row.email === email).map((row) => [row.membershipId, row.role]),
                        [[left.membershipId, "admin"]],
                    );
                }));
            }));

        it.effect("역할은 바꾸기 전 역할이 그대로일 때만 바꾼다", () =>
            Effect.gen(function*()
            {
                const team = yield* make([{ email: freshEmail(), role: "owner" }, { email: freshEmail(), role: "member" }]);
                const kim = at(team.members, 1);

                yield* within(team, Effect.gen(function*()
                {
                    const directory = yield* TeamDirectory;
                    const first = yield* directory.changeRole({ membershipId: kim.membershipId, from: "member", to: "admin" });
                    const stale = yield* directory.changeRole({ membershipId: kim.membershipId, from: "member", to: "admin" });
                    const row = yield* directory.findMember(team.tenantId, kim.membershipId);

                    assert.strictEqual(first, "done");
                    assert.strictEqual(stale, "conflict");
                    assert.strictEqual(row?.role, "admin");
                }));
            }));

        it.effect("INV-ACCESS-10 소유주의 멤버십은 끊지 않고, 끊은 멤버십은 목록과 찾기에서 빠진다", () =>
            Effect.gen(function*()
            {
                const team = yield* make([{ email: freshEmail(), role: "owner" }, { email: freshEmail(), role: "member" }]);
                const [owner, kim] = [at(team.members, 0), at(team.members, 1)];

                yield* within(team, Effect.gen(function*()
                {
                    const directory = yield* TeamDirectory;
                    const refused = yield* directory.deactivate(owner.membershipId);
                    const done = yield* directory.deactivate(kim.membershipId);
                    const rows = yield* directory.listMembers(team.tenantId);
                    const found = yield* directory.findMember(team.tenantId, kim.membershipId);

                    assert.strictEqual(refused, "conflict");
                    assert.strictEqual(done, "done");
                    assert.deepStrictEqual(rows.map((row) => row.membershipId), [owner.membershipId]);
                    assert.isNull(found);
                }));
            }));

        it.effect("INV-ACCESS-09 다른 테넌트의 멤버십 id 로 찾으면 없다", () =>
            Effect.gen(function*()
            {
                const other = yield* make([{ email: freshEmail(), role: "owner" }]);
                const team = yield* make([{ email: freshEmail(), role: "owner" }]);
                const found = yield* within(team, Effect.flatMap(TeamDirectory, (directory) =>
                    directory.findMember(team.tenantId, at(other.members, 0).membershipId)));

                assert.isNull(found);
            }));

        it.effect("INV-ACCESS-03 나간 계정은 목록과 찾기에서 빠진다", () =>
            Effect.gen(function*()
            {
                const team = yield* make([{ email: freshEmail(), role: "owner" }, { email: freshEmail(), role: "member", deactivated: true }]);
                const gone = at(team.members, 1);

                yield* within(team, Effect.gen(function*()
                {
                    const directory = yield* TeamDirectory;
                    const rows = yield* directory.listMembers(team.tenantId);
                    const found = yield* directory.findMember(team.tenantId, gone.membershipId);

                    assert.deepStrictEqual(rows.map((row) => row.membershipId), [at(team.members, 0).membershipId]);
                    assert.isNull(found);
                }));
            }));

        it.effect("초대하고 아직 로그인하지 않은 사람은 초대됨으로 온다", () =>
            Effect.gen(function*()
            {
                const team = yield* make([{ email: freshEmail(), role: "owner" }, { email: freshEmail(), role: "member", linked: false }]);
                const email = freshEmail();

                yield* within(team, Effect.gen(function*()
                {
                    const directory = yield* TeamDirectory;

                    yield* directory.createMember({ tenantId: team.tenantId, email, role: "member" });

                    const rows = yield* directory.listMembers(team.tenantId);

                    assert.deepStrictEqual(rows.map((row) => row.pending), [false, true, true]);
                }));
            }));

        it.effect("한 계정이 속한 조직을 이름과 함께 돌려준다. 끊긴 멤버십과 닫힌 조직은 빠진다", () =>
            Effect.gen(function*()
            {
                const email = freshEmail();
                const first = yield* make([{ email, role: "owner" }]);
                const accountId = at(first.members, 0).accountId;
                const second = yield* make([{ email: freshEmail(), role: "owner" }]);
                const third = yield* make([{ email: freshEmail(), role: "owner" }]);

                yield* within(second, Effect.gen(function*()
                {
                    const directory = yield* TeamDirectory;

                    yield* directory.addMembership({ tenantId: second.tenantId, accountId, role: "member" });
                    yield* directory.addMembership({ tenantId: third.tenantId, accountId, role: "member" });

                    const joined = (yield* directory.listMembers(third.tenantId)).find((row) => row.accountId === accountId);

                    yield* directory.deactivate(joined?.membershipId ?? "");

                    const orgs = yield* directory.accountOrgs(accountId);

                    assert.deepStrictEqual(orgs.map((org) => org.tenantId).sort(), [first.tenantId, second.tenantId].sort());
                    assert.isTrue(orgs.every((org) => org.name.length > 0));
                }));
            }));

        it.effect("이름 바꾸기는 그 계정 한 행만 바꾼다", () =>
            Effect.gen(function*()
            {
                const team = yield* make([{ email: freshEmail(), role: "owner", name: "소유" }, { email: freshEmail(), role: "member", name: "구성" }]);

                yield* within(team, Effect.gen(function*()
                {
                    const directory = yield* TeamDirectory;

                    yield* directory.rename({ accountId: at(team.members, 1).accountId, name: "김지우" });

                    const rows = yield* directory.listMembers(team.tenantId);

                    assert.deepStrictEqual(rows.map((row) => row.name), ["소유", "김지우"]);
                }));
            }));
    });
};

import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, Schema } from "effect";

import { TeamDirectory } from "@hathway/access/ports/TeamDirectory";
import { actorOf } from "@hathway/access/testing/actor";
import { teamWorldMemory } from "@hathway/access/testing/teamDirectoryMemory";

import { PlanLimits, unlimitedPlanLimits } from "@/extensions/PlanLimits";

import { changeRole, ChangeRoleInput, currentOrgName, invite, InviteInput, listTeam, myAccount, removeMember, renameMe, summarizeTeam, teamOverview } from "./team";

/**
 * 팀 유스케이스. 액션 파일이 부르는 조립을 메모리 명부로 도커 없이 잰다.
 *
 * ⚠ 판정 규칙 자체는 `packages/access` 의 `team.test.ts` 가 잰다. 여기서 보는 것은 **조립이 판정을 건너뛰지 않는가**다.
 * ⚠ 멤버 한도는 확장 지점(`PlanLimits`)이 답한다. 여기서는 코어의 기본 구현(한도 없음)으로 돌고, 요금제의 한도는 결제
 *    모듈이 잰다(`modules/<이름>/acceptance.json` 의 검사).
 */
const setUp = () =>
    Effect.gen(function*()
    {
        const world = teamWorldMemory();
        const team = yield* world.make([
            { email: "owner@example.test", role: "owner", name: "소유" },
            { email: "admin@example.test", role: "admin", name: "관리" },
            { email: "kim@example.test", role: "member", name: "김" },
        ]);
        const other = yield* world.make([{ email: "park@example.test", role: "owner", name: "박" }]);
        const as = (index: number) =>
        {
            const member = team.members[index];
            const role = (["owner", "admin", "member"] as const)[index] ?? "member";

            return actorOf({ accountId: member?.accountId ?? "", tenantId: team.tenantId, tenantKind: "customer", role });
        };
        const run = <A>(program: Effect.Effect<A, unknown, TeamDirectory | PlanLimits>) =>
            program.pipe(Effect.provide(Layer.mergeAll(team.layer, unlimitedPlanLimits)));

        return { team, other, as, run };
    });

describe("팀 유스케이스", () =>
{
    it.effect("INV-ACCESS-09 구성원이 초대 액션을 부르면 판정에서 거절되고 아무것도 쓰지 않는다", () =>
        Effect.gen(function*()
        {
            const { as, run } = yield* setUp();
            const result = yield* run(invite(as(2), { email: "new@example.test", role: "member" }));
            const view = yield* run(listTeam(as(2)));

            assert.isFalse(result.ok);
            assert.notInclude(view.members.map((member) => member.email), "new@example.test");
            assert.isFalse(view.canManage);
        }));

    it.effect("INV-ACCESS-09 다른 테넌트의 멤버십 id 를 넘기면 없는 것으로 답한다", () =>
        Effect.gen(function*()
        {
            const { other, as, run } = yield* setUp();
            const stranger = other.members[0]?.membershipId ?? "";
            const changed = yield* run(changeRole(as(0), { membershipId: stranger, from: "owner", to: "member" }));
            const removed = yield* run(removeMember(as(0), { membershipId: stranger }));

            // 소유주라서 막혔다는 답이 아니라 없다는 답이다. 다른 테넌트에 그 id 가 있다는 것도 알리지 않는다
            assert.deepStrictEqual([changed, removed], [
                { ok: false, message: "이미 팀에 없는 사람이에요. 새로고침해 주세요." },
                { ok: false, message: "이미 팀에 없는 사람이에요. 새로고침해 주세요." },
            ]);
        }));

    it.effect("역할 바꾸기는 열었을 때의 역할을 함께 받아, 그사이 바뀌었으면 덮어쓰지 않는다", () =>
        Effect.gen(function*()
        {
            const { team, as, run } = yield* setUp();
            const kim = team.members[2]?.membershipId ?? "";

            const first = yield* run(changeRole(as(0), { membershipId: kim, from: "member", to: "admin" }));
            // 다른 창에서 아직 「구성원」으로 보고 있던 사람이 다시 누른다
            const stale = yield* run(changeRole(as(1), { membershipId: kim, from: "member", to: "admin" }));
            const view = yield* run(listTeam(as(0)));

            assert.isTrue(first.ok);
            assert.isFalse(stale.ok);
            assert.strictEqual(view.members.find((member) => member.membershipId === kim)?.role, "admin");
        }));

    it.effect("입력은 Schema 가 먼저 거른다 (역할 문자열 · 주소 길이)", () =>
        Effect.sync(() =>
        {
            const decodeInvite = Schema.decodeUnknownExit(InviteInput);
            const decodeRole = Schema.decodeUnknownExit(ChangeRoleInput);

            assert.isTrue(decodeInvite({ email: "new@example.test", role: "member" })._tag === "Success");
            assert.isTrue(decodeInvite({ email: "new@example.test", role: "owner" })._tag === "Failure");
            assert.isTrue(decodeInvite({ email: `${"a".repeat(250)}@example.test`, role: "member" })._tag === "Failure");
            assert.isTrue(decodeRole({ membershipId: "1", from: "member", to: "owner" })._tag === "Failure");
            assert.isTrue(decodeRole({ membershipId: "1", from: "boss", to: "admin" })._tag === "Failure");
        }));

    it.effect("초대하면 목록에 서고, 내 이름은 내 계정에만 쓴다", () =>
        Effect.gen(function*()
        {
            const { as, run } = yield* setUp();
            const invited = yield* run(invite(as(1), { email: " New@Example.test ", role: "member" }));
            const renamed = yield* run(renameMe(as(2), { name: " 김지우 " }));
            const view = yield* run(listTeam(as(1)));

            assert.isTrue(invited.ok);
            assert.isTrue(renamed.ok);
            assert.include(view.members.map((member) => member.email), "new@example.test");
            assert.deepStrictEqual(view.members.map((member) => member.name), ["소유", "관리", "김지우", null]);
        }));

    it.effect("두 조직에 속한 사람에게만 지금 조직의 이름을 돌려준다", () =>
        Effect.gen(function*()
        {
            const { team, other, as, run } = yield* setUp();

            assert.isNull(yield* run(currentOrgName(as(2))));

            // 김이 다른 조직에도 들어간다
            yield* run(Effect.flatMap(TeamDirectory, (directory) =>
                directory.addMembership({ tenantId: other.tenantId, accountId: team.members[2]?.accountId ?? "", role: "member" })));

            assert.strictEqual(yield* run(currentOrgName(as(2))), `조직 ${team.tenantId}`);
        }));
});

describe("팀 화면의 요약", () =>
{
    /** 한도를 답하는 모듈이 붙은 자리. 요금제의 한도 자체는 그 모듈이 잰다 */
    const limited = (maxMembers: number, upgradeHref: string | null) =>
        Layer.succeed(PlanLimits, PlanLimits.of({ forActor: () => Effect.succeed({ maxMembers, mcp: true, upgradeHref }) }));

    it.effect("역할마다의 수와 초대만 받은 사람의 수를 센다", () =>
        Effect.gen(function*()
        {
            const { as, run } = yield* setUp();

            yield* run(invite(as(0), { email: "new@example.test", role: "member" }));

            const view = yield* run(teamOverview(as(2)));

            assert.deepStrictEqual(view.summary.roles, { owner: 1, admin: 1, member: 2 });
            assert.deepStrictEqual([view.summary.total, view.summary.joined, view.summary.invited], [4, 3, 1]);
            assert.isFalse(view.canManage);
        }));

    it.effect("멤버 한도가 없으면 자리를 재지 않고 인원만 센다", () =>
        Effect.gen(function*()
        {
            const { as, run } = yield* setUp();
            const view = yield* run(teamOverview(as(0)));

            assert.isNull(view.summary.seats);
            assert.isNull(view.upgradeHref);
            assert.strictEqual(view.summary.total, 3);
        }));

    it.effect("멤버 한도가 있으면 초대만 받은 사람까지 자리로 세고, 남은 자리와 한도를 올리러 갈 주소를 함께 준다", () =>
        Effect.gen(function*()
        {
            const { team, as } = yield* setUp();
            const layer = Layer.mergeAll(team.layer, limited(5, "/settings/billing"));

            yield* invite(as(0), { email: "new@example.test", role: "member" }).pipe(Effect.provide(layer));

            const view = yield* teamOverview(as(0)).pipe(Effect.provide(layer));

            assert.deepStrictEqual(view.summary.seats, { max: 5, left: 1 });
            assert.strictEqual(view.upgradeHref, "/settings/billing");
        }));

    it.effect("한도보다 많이 들어와 있어도 남은 자리는 0 아래로 내려가지 않는다", () =>
        Effect.gen(function*()
        {
            const { as, run } = yield* setUp();
            const { members } = yield* run(listTeam(as(0)));

            assert.deepStrictEqual(summarizeTeam(members, 2).seats, { max: 2, left: 0 });
        }));
});

describe("내 계정", () =>
{
    it.effect("지금 들어온 팀의 이름과 내 역할을 주고, 다른 팀은 속해 있을 때만 준다", () =>
        Effect.gen(function*()
        {
            const { team, other, as, run } = yield* setUp();
            const alone = yield* run(myAccount(as(2)));

            assert.deepStrictEqual(alone, { email: "kim@example.test", name: "김", role: "member", team: `조직 ${team.tenantId}`, otherTeams: [] });

            yield* run(Effect.flatMap(TeamDirectory, (directory) =>
                directory.addMembership({ tenantId: other.tenantId, accountId: team.members[2]?.accountId ?? "", role: "admin" })));

            const both = yield* run(myAccount(as(2)));

            // 역할은 지금 들어온 팀의 것이다. 다른 팀에서 관리자여도 여기서는 멤버다
            assert.strictEqual(both.role, "member");
            assert.deepStrictEqual(both.otherTeams, [`조직 ${other.tenantId}`]);
        }));
});

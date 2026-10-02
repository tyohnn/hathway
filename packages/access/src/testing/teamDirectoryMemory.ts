import { Effect, Layer, Ref } from "effect";

import type { MembershipRole } from "../domain/AppAudience.ts";
import { type MemberRow, TeamDirectory, type WriteOutcome } from "../ports/TeamDirectory.ts";
import type { MakeTeam, TeamSeedMember } from "./contracts/team-directory.ts";

/**
 * 팀 명부의 메모리 구현. 계약이 도커 없이 도는 자리다.
 *
 * ⚠ **명부 하나에 여러 테넌트가 선다.** `make` 를 부를 때마다 테넌트가 하나 늘고, 모든 테넌트가 같은 계정 · 멤버십
 *    표를 함께 쓴다. 다른 테넌트의 id 를 가리는지를 그렇게 잰다.
 * ⚠ **쓰기는 모두 한 번의 `Ref.modify` 안에서 끝난다.** 보고 나서 쓰는 사이에 다른 쓰기가 끼어들 틈이 없다.
 *    Postgres 구현은 조건을 단 한 문장과 유일 제약으로 같은 답을 낸다.
 */
interface Account
{
    readonly id: string;
    readonly email: string;
    readonly name: string | null;
    readonly deactivated: boolean;
    readonly linked: boolean;
}

interface Membership
{
    readonly id: string;
    readonly accountId: string;
    readonly tenantId: string;
    readonly role: MembershipRole;
    readonly active: boolean;
}

interface World
{
    readonly accounts: ReadonlyArray<Account>;
    readonly memberships: ReadonlyArray<Membership>;
    readonly tenants: number;
    readonly sequence: number;
}

const RANK: Readonly<Record<MembershipRole, number>> = { owner: 0, admin: 1, member: 2 };

const rowOf = (world: World, membership: Membership): MemberRow =>
{
    const account = world.accounts.find((entry) => entry.id === membership.accountId);

    return {
        membershipId: membership.id,
        accountId: membership.accountId,
        tenantId: membership.tenantId,
        role: membership.role,
        email: account?.email ?? "",
        name: account?.name ?? null,
        pending: !(account?.linked ?? false),
    };
};

/** 목록과 찾기에 서는 멤버십. 살아 있고 계정이 나가지 않았다 */
const listed = (world: World, membership: Membership): boolean =>
    membership.active && world.accounts.some((account) => account.id === membership.accountId && !account.deactivated);

const replace = (world: World, id: string, patch: Partial<Membership>): World => ({
    ...world,
    memberships: world.memberships.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
});

export const teamWorldMemory = (): { readonly make: MakeTeam } =>
{
    let state: Ref.Ref<World> | null = null;

    const world = (): Effect.Effect<Ref.Ref<World>> =>
        state === null
            ? Effect.tap(Ref.make<World>({ accounts: [], memberships: [], tenants: 0, sequence: 0 }), (made) =>
                Effect.sync(() =>
                {
                    state = made;
                }))
            : Effect.succeed(state);

    const seed = (ref: Ref.Ref<World>, members: ReadonlyArray<TeamSeedMember>) =>
        Ref.modify(ref, (current): [{ tenantId: string; members: Array<{ accountId: string; membershipId: string }> }, World] =>
        {
            const tenantId = `t${current.tenants + 1}`;
            let sequence = current.sequence;
            const accounts: Array<Account> = [];
            const memberships: Array<Membership> = [];

            for (const member of members)
            {
                sequence += 1;
                accounts.push({
                    id: `a${sequence}`,
                    email: member.email,
                    name: member.name ?? null,
                    deactivated: member.deactivated ?? false,
                    linked: member.linked ?? true,
                });
                memberships.push({ id: `m${sequence}`, accountId: `a${sequence}`, tenantId, role: member.role, active: member.active ?? true });
            }

            return [
                { tenantId, members: memberships.map((entry) => ({ accountId: entry.accountId, membershipId: entry.id })) },
                {
                    accounts: [...current.accounts, ...accounts],
                    memberships: [...current.memberships, ...memberships],
                    tenants: current.tenants + 1,
                    sequence,
                },
            ];
        });

    const layerOf = (ref: Ref.Ref<World>) => Layer.succeed(TeamDirectory, TeamDirectory.of({
        listMembers: (tenantId) =>
            Ref.get(ref).pipe(Effect.map((current) =>
                current.memberships
                    .filter((entry) => entry.tenantId === tenantId && listed(current, entry))
                    .map((entry, index) => ({ entry, index }))
                    .sort((left, right) => RANK[left.entry.role] - RANK[right.entry.role] || left.index - right.index)
                    .map(({ entry }) => rowOf(current, entry)))),

        findMember: (tenantId, membershipId) =>
            Ref.get(ref).pipe(Effect.map((current) =>
            {
                const found = current.memberships.find((entry) => entry.id === membershipId && entry.tenantId === tenantId && listed(current, entry));

                return found === undefined ? null : rowOf(current, found);
            })),

        inviteTarget: (tenantId, email) =>
            Ref.get(ref).pipe(Effect.map((current) =>
            {
                const account = current.accounts.find((entry) => entry.email.toLowerCase() === email);

                if (account === undefined)
                {
                    return null;
                }

                const membership = current.memberships.find((entry) => entry.accountId === account.id && entry.tenantId === tenantId);

                return {
                    accountId: account.id,
                    deactivated: account.deactivated,
                    membership: membership === undefined ? null : { membershipId: membership.id, active: membership.active },
                };
            })),

        createMember: ({ tenantId, email, role }) =>
            Ref.modify(ref, (current): [WriteOutcome, World] =>
            {
                if (current.accounts.some((entry) => entry.email.toLowerCase() === email))
                {
                    return ["conflict", current];
                }

                const sequence = current.sequence + 1;

                return ["done", {
                    ...current,
                    sequence,
                    accounts: [...current.accounts, { id: `a${sequence}`, email, name: null, deactivated: false, linked: false }],
                    memberships: [...current.memberships, { id: `m${sequence}`, accountId: `a${sequence}`, tenantId, role, active: true }],
                }];
            }),

        addMembership: ({ tenantId, accountId, role }) =>
            Ref.modify(ref, (current): [WriteOutcome, World] =>
            {
                if (current.memberships.some((entry) => entry.accountId === accountId && entry.tenantId === tenantId))
                {
                    return ["conflict", current];
                }

                const sequence = current.sequence + 1;

                return ["done", {
                    ...current,
                    sequence,
                    memberships: [...current.memberships, { id: `m${sequence}`, accountId, tenantId, role, active: true }],
                }];
            }),

        reactivate: ({ membershipId, role }) =>
            Ref.modify(ref, (current): [WriteOutcome, World] =>
                current.memberships.some((entry) => entry.id === membershipId && !entry.active)
                    ? ["done", replace(current, membershipId, { active: true, role })]
                    : ["conflict", current]),

        changeRole: ({ membershipId, from, to }) =>
            Ref.modify(ref, (current): [WriteOutcome, World] =>
                current.memberships.some((entry) => entry.id === membershipId && entry.active && entry.role === from)
                    ? ["done", replace(current, membershipId, { role: to })]
                    : ["conflict", current]),

        deactivate: (membershipId) =>
            Ref.modify(ref, (current): [WriteOutcome, World] =>
                current.memberships.some((entry) => entry.id === membershipId && entry.active && entry.role !== "owner")
                    ? ["done", replace(current, membershipId, { active: false })]
                    : ["conflict", current]),

        accountOrgs: (accountId) =>
            Ref.get(ref).pipe(Effect.map((current) =>
                current.memberships
                    .filter((entry) => entry.accountId === accountId && entry.active)
                    .map((entry) => ({ tenantId: entry.tenantId, name: `조직 ${entry.tenantId}` })))),

        rename: ({ accountId, name }) =>
            Ref.update(ref, (current) => ({
                ...current,
                accounts: current.accounts.map((entry) => (entry.id === accountId ? { ...entry, name } : entry)),
            })),
    }));

    return {
        make: (members) =>
            Effect.gen(function*()
            {
                const ref = yield* world();
                const seeded = yield* seed(ref, members);

                return { layer: layerOf(ref), tenantId: seeded.tenantId, members: seeded.members };
            }),
    };
};

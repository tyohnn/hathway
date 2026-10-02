import { Effect, Layer, Ref } from "effect";

import type { TenantMembership } from "../access/membership.ts";
import { AccountDirectory, type LinkOutcome } from "../ports/AccountDirectory.ts";

/**
 * 계정 명부의 메모리 구현. 계약이 도커 없이 도는 자리다.
 *
 * ⚠ **잇기가 한 번의 `Ref.modify` 안에서 끝난다.** 보고 나서 쓰는 사이에 다른 세션이 끼어들 틈이 없다.
 *    Postgres 구현은 `where auth_user_id is null` 을 단 한 문장의 UPDATE 로 같은 답을 낸다.
 */
export interface AccountSeed
{
    /** 명부에 적힌 그대로. 소문자로 적는다 */
    readonly email: string;
    readonly authUserId: string | null;
    readonly deactivated?: boolean;
    readonly memberships?: ReadonlyArray<TenantMembership>;
}

interface StoredAccount
{
    readonly accountId: string;
    readonly email: string;
    readonly authUserId: string | null;
    readonly deactivated: boolean;
    readonly memberships: ReadonlyArray<TenantMembership>;
}

export interface AccountDirectoryMemory
{
    readonly layer: Layer.Layer<AccountDirectory>;
    readonly accountIds: ReadonlyArray<string>;
    /** 잇는 쓰기가 몇 번 나갔는가. 매 요청마다 쓰기가 나가지 않는지를 재는 자리다 */
    readonly linkCalls: Effect.Effect<number>;
}

export const accountDirectoryMemory = (seeds: ReadonlyArray<AccountSeed>): Effect.Effect<AccountDirectoryMemory> =>
    Effect.gen(function*()
    {
        const accounts = yield* Ref.make<ReadonlyArray<StoredAccount>>(seeds.map((seed, index) => ({
            accountId: String(index + 1),
            email: seed.email,
            authUserId: seed.authUserId,
            deactivated: seed.deactivated ?? false,
            memberships: seed.memberships ?? [],
        })));
        const calls = yield* Ref.make(0);

        const layer = Layer.succeed(AccountDirectory, AccountDirectory.of({
            factsBySession: (authUserId) =>
                Ref.get(accounts).pipe(Effect.map((rows) =>
                {
                    const found = rows.find((row) => row.authUserId === authUserId);

                    return found === undefined
                        ? null
                        : { accountId: found.accountId, deactivated: found.deactivated, memberships: found.memberships };
                })),

            linkableByEmail: (email) =>
                Ref.get(accounts).pipe(Effect.map((rows) =>
                {
                    const found = rows.find((row) => row.email.toLowerCase() === email.toLowerCase());

                    return found === undefined
                        ? null
                        : { accountId: found.accountId, authUserId: found.authUserId, deactivated: found.deactivated };
                })),

            link: (request) =>
                Ref.update(calls, (count) => count + 1).pipe(Effect.andThen(Ref.modify(accounts, (rows): [LinkOutcome, ReadonlyArray<StoredAccount>] =>
                {
                    if (rows.some((row) => row.authUserId === request.authUserId && row.accountId !== request.accountId))
                    {
                        return ["session_taken", rows];
                    }

                    const target = rows.find((row) => row.accountId === request.accountId);

                    if (target === undefined || target.authUserId !== null || target.email.toLowerCase() !== request.email)
                    {
                        return ["not_linked", rows];
                    }

                    return [
                        "linked",
                        rows.map((row) => (row === target ? { ...row, authUserId: request.authUserId } : row)),
                    ];
                }))),
        }));

        return { layer, accountIds: seeds.map((_, index) => String(index + 1)), linkCalls: Ref.get(calls) };
    });

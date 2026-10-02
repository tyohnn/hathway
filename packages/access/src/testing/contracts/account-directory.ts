import { assert, describe, it } from "@effect/vitest";
import { Effect, type Layer } from "effect";

import { AccountDirectory } from "../../ports/AccountDirectory.ts";
import type { AccountSeed } from "../accountDirectoryMemory.ts";

/**
 * 계정 명부의 계약. 메모리 구현과 Postgres 구현이 **같은 코드로** 돈다.
 *
 * ⚠ **주소와 세션을 검사마다 새로 짓는다.** Postgres 는 여러 검사와 로컬 시드가 한 표를 함께 쓰고
 *    `lower(email)` 과 `auth_user_id` 가 유일하므로, 고정 값을 쓰면 두 번째 실행부터 시드가 부딪친다.
 */
export interface SeededDirectory
{
    readonly layer: Layer.Layer<AccountDirectory>;
    readonly accountIds: ReadonlyArray<string>;
}

export type MakeAccountDirectory = (seeds: ReadonlyArray<AccountSeed>) => Effect.Effect<SeededDirectory>;

const fresh = (): string => crypto.randomUUID().slice(0, 8);
const freshEmail = (): string => `link-${fresh()}@example.test`;
const freshSession = (): string => crypto.randomUUID();

export const accountDirectoryContract = (name: string, make: MakeAccountDirectory): void =>
{
    const within = <A, E>(
        seeds: ReadonlyArray<AccountSeed>,
        program: (accountIds: ReadonlyArray<string>) => Effect.Effect<A, E, AccountDirectory>,
    ) =>
        Effect.gen(function*()
        {
            const seeded = yield* make(seeds);

            return yield* program(seeded.accountIds).pipe(Effect.provide(seeded.layer));
        });

    describe(`계정에 세션을 잇는 쓰기 (${name})`, () =>
    {
        it.effect("붙은 세션이 없으면 세션으로 찾은 사실은 없다 — 조회 실패가 아니라 부재다", () =>
            within([{ email: freshEmail(), authUserId: null }], () =>
                Effect.flatMap(AccountDirectory, (directory) => directory.factsBySession(freshSession())).pipe(
                    Effect.map((facts) => assert.isNull(facts)),
                )));

        it.effect("INV-ACCESS-08 비어 있는 계정에 붙이면 그 세션으로 찾힌다", () =>
        {
            const email = freshEmail();
            const session = freshSession();

            return within([{ email, authUserId: null }], ([accountId]) =>
                Effect.gen(function*()
                {
                    const directory = yield* AccountDirectory;
                    const outcome = yield* directory.link({ accountId: accountId as string, authUserId: session, email });
                    const facts = yield* directory.factsBySession(session);

                    assert.strictEqual(outcome, "linked");
                    assert.strictEqual(facts?.accountId, accountId);
                    assert.strictEqual(facts?.deactivated, false);
                }));
        });

        it.effect("INV-ACCESS-08 비어 있는 계정에만 쓴다 — 두 세션이 동시에 들어와도 먼저 온 쪽만 붙는다", () =>
        {
            const email = freshEmail();
            const [first, second] = [freshSession(), freshSession()];

            return within([{ email, authUserId: null }], ([accountId]) =>
                Effect.gen(function*()
                {
                    const directory = yield* AccountDirectory;
                    const outcomes = yield* Effect.all(
                        [first, second].map((session) => directory.link({ accountId: accountId as string, authUserId: session, email })),
                        { concurrency: "unbounded" },
                    );
                    const found = yield* Effect.all([directory.factsBySession(first), directory.factsBySession(second)]);

                    assert.deepStrictEqual([...outcomes].sort(), ["linked", "not_linked"]);
                    assert.strictEqual(found.filter((facts) => facts !== null).length, 1);
                }));
        });

        it.effect("INV-ACCESS-08 이미 붙은 계정은 덮지 않는다 — 같은 주소를 다시 얻은 사람이 남의 계정을 가져간다", () =>
        {
            const email = freshEmail();
            const [owner, stranger] = [freshSession(), freshSession()];

            return within([{ email, authUserId: owner }], ([accountId]) =>
                Effect.gen(function*()
                {
                    const directory = yield* AccountDirectory;
                    const outcome = yield* directory.link({ accountId: accountId as string, authUserId: stranger, email });

                    assert.strictEqual(outcome, "not_linked");
                    assert.strictEqual((yield* directory.factsBySession(owner))?.accountId, accountId);
                    assert.isNull(yield* directory.factsBySession(stranger));
                }));
        });

        it.effect("주소가 달라진 계정에는 붙이지 않는다 — 판정과 쓰기 사이에 주소가 바뀌어도 쓰기가 한 번 더 확인한다", () =>
        {
            const session = freshSession();

            return within([{ email: freshEmail(), authUserId: null }], ([accountId]) =>
                Effect.gen(function*()
                {
                    const directory = yield* AccountDirectory;
                    const outcome = yield* directory.link({ accountId: accountId as string, authUserId: session, email: freshEmail() });

                    assert.strictEqual(outcome, "not_linked");
                    assert.isNull(yield* directory.factsBySession(session));
                }));
        });

        it.effect("그 세션이 이미 다른 계정에 붙어 있으면 유일 제약의 거절을 결과로 접는다 — 500 으로 새지 않는다", () =>
        {
            const [mine, other] = [freshEmail(), freshEmail()];
            const session = freshSession();

            return within([{ email: mine, authUserId: session }, { email: other, authUserId: null }], ([, otherId]) =>
                Effect.gen(function*()
                {
                    const directory = yield* AccountDirectory;
                    const outcome = yield* directory.link({ accountId: otherId as string, authUserId: session, email: other });

                    assert.strictEqual(outcome, "session_taken");
                    assert.strictEqual((yield* directory.linkableByEmail(other))?.authUserId, null);
                }));
        });

        it.effect("이메일은 대소문자를 무시하고 찾는다 — account_email_lower_key 와 같은 규칙이다", () =>
        {
            const local = `Link-${fresh()}`;

            return within([{ email: `${local}@Example.Test`, authUserId: null, deactivated: true }], ([accountId]) =>
                Effect.gen(function*()
                {
                    const found = yield* (yield* AccountDirectory).linkableByEmail(`${local.toLowerCase()}@example.test`);

                    assert.deepStrictEqual(found, { accountId, authUserId: null, deactivated: true });
                }));
        });

        it.effect("명부에 없는 주소는 찾지 못한다", () =>
            within([{ email: freshEmail(), authUserId: null }], () =>
                Effect.flatMap(AccountDirectory, (directory) => directory.linkableByEmail(freshEmail())).pipe(
                    Effect.map((found) => assert.isNull(found)),
                )));
    });
};

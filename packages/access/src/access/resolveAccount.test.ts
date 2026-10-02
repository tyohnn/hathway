import { assert, describe, it } from "vitest";
import { Effect, Layer } from "effect";

import type { AccountDirectory } from "../ports/AccountDirectory.ts";
import type { AuthSettings } from "../ports/AuthSettings.ts";
import { accountDirectoryMemory, type AccountSeed } from "../testing/accountDirectoryMemory.ts";
import { authSettingsMemory } from "../testing/authSettingsMemory.ts";

import type { SignedInUser } from "./accountLink.ts";
import { actorForApp } from "./actorForApp.ts";
import { resolveAccountFacts } from "./resolveAccount.ts";

const SESSION = "00000000-0000-4000-8000-0000000000a1";

const USER: SignedInUser = { authUserId: SESSION, email: "kim@example.test", emailConfirmed: true };

interface Probes
{
    /** 잇는 쓰기가 몇 번 나갔는가 */
    readonly linkCalls: Effect.Effect<number>;
    /** 인증 서버 설정을 몇 번 물었는가 */
    readonly settingsReads: Effect.Effect<number>;
}

const run = <A, E>(
    seeds: ReadonlyArray<AccountSeed>,
    program: (probes: Probes) => Effect.Effect<A, E, AccountDirectory | AuthSettings>,
    settings: boolean | "unavailable" = true,
): Promise<A> =>
    Effect.runPromise(Effect.gen(function*()
    {
        const directory = yield* accountDirectoryMemory(seeds);
        const auth = yield* authSettingsMemory(settings);

        return yield* program({ linkCalls: directory.linkCalls, settingsReads: auth.reads }).pipe(
            Effect.provide(Layer.mergeAll(directory.layer, auth.layer)),
        );
    }));

describe("세션으로 계정을 찾지 못했을 때", () =>
{
    it("세션으로 찾히는 사람에게는 잇기를 시도하지 않는다 — 매 요청마다 쓰기가 나가지 않는다", async () =>
    {
        const [facts, calls] = await run(
            [{ email: "kim@example.test", authUserId: SESSION }],
            ({ linkCalls }) => Effect.all([resolveAccountFacts(USER), linkCalls]),
        );

        assert.strictEqual(facts.accountId, "1");
        assert.strictEqual(calls, 0);
    });

    it("이메일로 찾아 이은 뒤 그 계정의 소속 사실을 돌려준다 — 옮긴 사람이 첫 요청에서 바로 들어간다", async () =>
    {
        const [first, second] = await run(
            [{ email: "lee@example.test", authUserId: null }, { email: "kim@example.test", authUserId: null }],
            () => Effect.all([resolveAccountFacts(USER), resolveAccountFacts(USER)]),
        );

        assert.strictEqual(first.accountId, "2");
        assert.strictEqual(second.accountId, "2");
    });

    it("잇지 못하면 까닭과 상관없이 같은 NotAppMember 로 답한다 — 명부에 있는지를 밖에 알리지 않는다 (INV-ACCESS-06)", async () =>
    {
        const outsider = await run([], () => Effect.flip(resolveAccountFacts(USER)));
        const taken = await run(
            [{ email: "kim@example.test", authUserId: "00000000-0000-4000-8000-0000000000b2" }],
            () => Effect.flip(resolveAccountFacts(USER)),
        );

        assert.strictEqual(outsider._tag, "NotAppMember");
        assert.deepStrictEqual(taken, outsider);
    });

    it("잇는 판정은 문을 열지 않는다 — 이은 뒤에도 이 앱의 멤버십이 없으면 canEnterApp 이 막는다", async () =>
    {
        const failure = await run(
            [{ email: "kim@example.test", authUserId: null }],
            () => Effect.flip(resolveAccountFacts(USER).pipe(Effect.flatMap((account) => actorForApp({ app: "agent", account })))),
        );

        assert.strictEqual(failure._tag, "NotAppMember");
    });
});

describe("잇기 직전에 인증 서버 설정을 본다", () =>
{
    it("INV-ACCESS-08 이메일 확인이 꺼진 프로젝트에서는 잇지 않는다 — 확인 시각이 그 주소의 주인이라는 증거가 되지 못한다", async () =>
    {
        const [failure, calls] = await run(
            [{ email: "kim@example.test", authUserId: null }],
            ({ linkCalls }) => Effect.all([Effect.flip(resolveAccountFacts(USER)), linkCalls]),
            false,
        );

        assert.strictEqual(failure._tag, "NotAppMember");
        assert.strictEqual(calls, 0);
    });

    it("잇기 직전에만 설정을 묻는다 — 이미 이어진 사람과 명부에 없는 사람에게는 묻지 않는다", async () =>
    {
        const linkedReads = await run(
            [{ email: "kim@example.test", authUserId: SESSION }],
            ({ settingsReads }) => resolveAccountFacts(USER).pipe(Effect.andThen(settingsReads)),
        );
        const outsiderReads = await run(
            [],
            ({ settingsReads }) => Effect.flip(resolveAccountFacts(USER)).pipe(Effect.andThen(settingsReads)),
        );
        const firstReads = await run(
            [{ email: "kim@example.test", authUserId: null }],
            ({ settingsReads }) => resolveAccountFacts(USER).pipe(Effect.andThen(settingsReads)),
        );

        assert.deepStrictEqual([linkedReads, outsiderReads, firstReads], [0, 0, 1]);
    });

    it("설정을 읽지 못하면 잇지 않고 같은 NotAppMember 로 답한다 — 장애가 권한 상승이 되지 않는다", async () =>
    {
        const [failure, calls] = await run(
            [{ email: "kim@example.test", authUserId: null }],
            ({ linkCalls }) => Effect.all([Effect.flip(resolveAccountFacts(USER)), linkCalls]),
            "unavailable",
        );
        const outsider = await run([], () => Effect.flip(resolveAccountFacts(USER)));

        assert.deepStrictEqual(failure, outsider);
        assert.strictEqual(calls, 0);
    });
});

import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";

import { ActorResolver, NoSession, NotAppMember } from "../ports/ActorResolver.ts";
import { customerActor } from "../testing/actor.ts";

import { entryOutcome } from "./entryOutcome.ts";

/**
 * 셸의 문 앞 판정.
 *
 * 여기서 지키는 것은 하나입니다. **실패의 종류를 하나로 접지 않아야 합니다.** 세션이 없는 것과 소속이
 * 아닌 것은 사람이 할 일이 다르고, 둘을 접으면 화면이 그 둘을 같은 말로 안내하게 됩니다.
 */
const resolving = (current: ActorResolver["Service"]["current"]): Layer.Layer<ActorResolver> =>
    Layer.succeed(ActorResolver, ActorResolver.of({ current }));

const anActor = Effect.succeed(customerActor("1"));

describe("셸의 문 앞 판정", () =>
{
    it.effect("행위자가 확정되면 들어간다", () =>
        Effect.gen(function*()
        {
            const outcome = yield* entryOutcome.pipe(Effect.provide(resolving(anActor)));

            assert.strictEqual(outcome, "allowed");
        }));

    it.effect("세션이 없으면 로그인으로 갈 어휘를 돌려준다", () =>
        Effect.gen(function*()
        {
            const failing = resolving(Effect.fail(new NoSession({ reason: "로그인하지 않았다" })));
            const outcome = yield* entryOutcome.pipe(Effect.provide(failing));

            assert.strictEqual(outcome, "no-session");
        }));

    it.effect("소속이 아니면 다른 어휘를 돌려준다 — 두 실패를 하나로 접지 않는다", () =>
        Effect.gen(function*()
        {
            const failing = resolving(Effect.fail(new NotAppMember({ reason: "운영팀이 아니다" })));
            const outcome = yield* entryOutcome.pipe(Effect.provide(failing));

            assert.strictEqual(outcome, "not-member");
            assert.notStrictEqual(outcome, "no-session");
        }));

    it.effect("어디로 보낼지는 정하지 않는다 — 돌려주는 것이 주소가 아니라 어휘다", () =>
        Effect.gen(function*()
        {
            const outcome = yield* entryOutcome.pipe(Effect.provide(resolving(anActor)));

            assert.isFalse(String(outcome).startsWith("/"));
        }));
});

import "server-only";

import { Effect, Exit } from "effect";

import type { Actor } from "@investment/access/domain/Actor";
import { ActorResolver } from "@investment/access/ports/ActorResolver";

import { actorResolverLayer } from "./auth";
import { runtime } from "./runtime";

/**
 * 지금 화면을 보는 사람. 로그인하지 않았거나 이 앱의 구성원이 아니면 `null` 이다.
 *
 * 이 앱은 읽기가 공개라서(INV-RESEARCH-01) 화면이 「행위자가 없는 채로」 설 수 있다. 스캐폴드의 `appRead` 는
 * 행위자가 없으면 로그인으로 보내지만, 여기서는 보내지 않고 `null` 로 답한다. 화면은 이것으로 쓰는 단추를
 * 세울지와 계정 자리에 무엇을 적을지만 정한다.
 *
 * ⚠ **이것은 표시를 위한 값이다. 쓰기를 여는 판정이 아니다.** 쓰기는 관문 `appAction` 이 요청마다 행위자를
 *    다시 확정한다. 화면이 단추를 세웠다는 것을 서버는 믿지 않는다.
 * ⚠ 행위자를 세우는 길은 관문과 같은 `ActorResolver` 하나다. 여기서 세션을 따로 읽지 않는다.
 */
export const viewer = async (): Promise<Actor | null> =>
{
    const exit = await runtime.runPromiseExit(
        Effect.flatMap(ActorResolver, (resolver) => resolver.current).pipe(Effect.provide(actorResolverLayer())),
    );

    return Exit.isSuccess(exit) ? exit.value : null;
};

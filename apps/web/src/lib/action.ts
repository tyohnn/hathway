import "server-only";

import { Effect, Schema } from "effect";

import type { Actor } from "@investment/access/domain/Actor";
import { ActorResolver } from "@investment/access/ports/ActorResolver";

import { actorResolverLayer } from "./auth";
import { runtime } from "./runtime";

/**
 * 서버 액션의 관문.
 *
 * 서버 액션은 API 라우트와 똑같이 **공개 엔드포인트**인데, tRPC 의 `businessCenterProcedure` 같은 빌더가 없어서
 * `export async function` 하나면 클라이언트가 바로 닿는다. 즉 **잊을 수 있는 구조**다. 그 자리를 이 함수가 메운다.
 *
 * 규약(`docs/개발-방법론.md` 「서버 액션 규약」)의 ①②를 여기서 강제하고, ③에 필요한 두 입력을 핸들러에 준다.
 *
 *   ① Schema 파싱   ← 여기
 *   ② 인증          ← 여기 (`ActorResolver`)
 *   ③ 행 단위 판정   ← 핸들러. 다만 **입력을 지어낼 수 없다.** `actor` 는 브랜드 타입이라 객체 리터럴이
 *                       그 타입이 되지 못한다. 게이트를 통째로 내리는 스위치는 이 앱에 **없다**
 *   ④~⑥            ← 핸들러
 *
 * ⚠ 핸들러는 **세션·쿠키·헤더를 받지 않는다.** 받을 수단이 없어야 "이미 위에서 검사했으니" 라는 분기가 안 생긴다.
 * ⚠ `ActorResolver` 는 요청 스코프라 모듈 스코프 런타임에 올리지 않고 여기서 매 요청 주입한다.
 * ⚠ **이름에 도메인을 담지 않는다.** 이 관문이 하는 일은 파싱과 행위자 확정뿐이라 어느 업무 영역도 타지 않는다.
 */
export interface ActionContext<Input>
{
    readonly input: Input;
    /** 인증을 지난 행위자. 행 단위 판정(`canSeeNote` 등)의 첫 입력이다 */
    readonly actor: Actor;
}

export class InvalidActionInput extends Schema.TaggedError<InvalidActionInput>()(
    "InvalidActionInput",
    { message: Schema.String },
)
{}

/**
 * ⚠ 파서는 **모듈 스코프에서 한 번** 만들어진다: `appAction` 을 모듈 스코프에서 부르고 그 결과를 export 할 것.
 *    액션 함수 안에서 부르면 요청마다 파서를 다시 만든다.
 */
export const appAction = <Input, Encoded, Output, Failure, Services>(
    options: { readonly input: Schema.Codec<Input, Encoded> },
    handler: (context: ActionContext<Input>) => Effect.Effect<Output, Failure, Services>,
) =>
{
    const decode = Schema.decodeUnknownEffect(options.input);

    return (raw: unknown): Promise<Output> =>
    {
        const program = Effect.gen(function*()
        {
            // ① 클라이언트가 보낸 모양을 신뢰하지 않는다
            const input = yield* decode(raw).pipe(
                Effect.mapError((error) => new InvalidActionInput({ message: String(error) })),
            );

            // ② 세션에서 행위자를 확정한다. 익명 폴백은 없다
            const resolver = yield* ActorResolver;
            const actor = yield* resolver.current;

            // ③~⑥ 은 핸들러의 몫이고, 그 입력은 여기서만 나온다
            return yield* handler({ input, actor });
        }).pipe(Effect.provide(actorResolverLayer()));

        return runtime.runPromise(program as Effect.Effect<Output, unknown, never>);
    };
};

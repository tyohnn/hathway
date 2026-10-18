import "server-only";

import { Effect } from "effect";

import { McpSurface } from "@/extensions/McpSurface";
import type { ConsentTool } from "@/lib/consent";
import { TOOLS } from "@/lib/mcp";
import { extensionsLayer } from "@/lib/modules";

import { supabaseServer } from "../lib/supabase/server";

/**
 * OAuth 동의 화면이 읽고 쓰는 자리.
 *
 * Supabase 가 인가 요청을 받으면 이 앱의 `/oauth/consent` 로 보내면서 `authorization_id` 를 붙인다. 그 값으로
 * 누가 무엇을 요청하는지 읽고, 사람이 정하면 그 결과를 Supabase 에 돌려준 뒤 돌아갈 주소로 보낸다.
 *
 * ⚠ **브라우저에서 Supabase 를 부르지 않는다.** 세션 쿠키를 서버가 이미 들고 있고, 이 저장소는 서버 액션으로
 *    완결하는 규약이다. 브라우저 클라이언트를 하나 더 세우면 세션을 읽는 자리가 둘이 된다.
 *
 * ⚠ **돌아갈 주소를 우리가 만들지 않는다.** Supabase 가 코드와 상태를 붙여 돌려준 주소를 그대로 쓴다. 우리가
 *    조립하면 그 순간 리다이렉트 주소를 검증하는 책임이 이쪽으로 넘어온다.
 */
/**
 * 인가 요청을 읽은 결과 셋.
 *
 * ⚠ **이미 허용한 사람은 묻지 않는다.** 같은 앱에 같은 범위를 두 번째로 허용할 때 Supabase 는 화면 대신
 *    돌아갈 주소를 바로 준다. 그때도 단추를 보이면 사람이 이미 한 일을 또 한다.
 */
export type ConsentView =
    | {
        readonly kind: "ask";
        readonly clientName: string;
        readonly email: string;
        /** 허용한 뒤 돌아갈 주소. 등록된 주소의 뿌리이고 쿼리는 없다 */
        readonly redirectUri: string;
        readonly scopes: ReadonlyArray<string>;
    }
    | { readonly kind: "redirect"; readonly url: string }
    | { readonly kind: "gone" };

export const readConsent = async (authorizationId: string): Promise<ConsentView> =>
{
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

    if (error !== null || data === null || data === undefined)
    {
        return { kind: "gone" };
    }

    if (!("authorization_id" in data))
    {
        return { kind: "redirect", url: data.redirect_url };
    }

    return {
        kind: "ask",
        clientName: data.client.name ?? "이름 없는 앱",
        email: data.user.email,
        redirectUri: data.redirect_uri,
        scopes: data.scope.split(" ").filter((part: string) => part !== ""),
    };
};

/** 허용하거나 거절한 뒤 돌아갈 주소. Supabase 가 준 값을 그대로 돌려준다 */
export const decideConsent = async (
    authorizationId: string,
    decision: "approve" | "deny",
): Promise<string | null> =>
{
    const supabase = await supabaseServer();

    const { data, error } = decision === "approve"
        ? await supabase.auth.oauth.approveAuthorization(authorizationId)
        : await supabase.auth.oauth.denyAuthorization(authorizationId);

    return error !== null || data === null || data === undefined ? null : data.redirect_url;
};

/**
 * 토큰으로 부를 수 있는 도구 전부. `/api/mcp` 의 `tools/list` 가 내놓는 것과 같은 목록이다(코어의 도구 + 모듈이 더한 것).
 *
 * ⚠ **모듈을 잇지 못하면 코어의 도구만 보인다.** 그때는 `/api/mcp` 도 같은 까닭으로 모든 요청을 거절하므로, 화면에 덜
 *    보인 도구가 실제로 불리는 일은 없다.
 */
export const consentTools = async (): Promise<ReadonlyArray<ConsentTool>> =>
{
    const surfaceTools = await Effect.runPromise(
        Effect.gen(function*()
        {
            const layer = yield* extensionsLayer;
            const surface = yield* Effect.gen(function*()
            {
                return yield* McpSurface;
            }).pipe(Effect.provide(layer));

            return surface.shape.tools;
        }),
    ).catch((): ReadonlyArray<ConsentTool> => []);

    return [...TOOLS, ...surfaceTools];
};

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { paths } from "@/lib/paths";
import { supabaseConfig } from "@/lib/supabase/server";

/**
 * 세션 쿠키를 갱신하고, 로그인하지 않은 사람을 로그인 화면으로 보낸다.
 *
 * ⚠ **미들웨어는 문 앞의 안내이지 자물쇠가 아니다.** 실제 판정은 서버 액션의 관문(`lib/action.ts`)과
 *    셸의 게이트가 매 요청 다시 한다: 미들웨어만 믿으면 액션 하나가 라우트 밖에서 불릴 때 아무도 보지 않는다.
 *    여기서 하는 일은 둘이다: 만료된 토큰을 갱신해 쿠키에 적는 것, 그리고 갈 곳을 안내하는 것.
 *
 * ⚠ **응답 객체를 새로 만들지 말 것.** `supabase.auth.getUser()` 가 갱신한 쿠키는 아래에서 만든 `response`
 *    에 적힌다. 중간에 다른 응답을 만들어 돌려주면 그 쿠키가 사라지고, 브라우저는 만료된 토큰을 계속 보낸다.
 * ⚠ **소속 판정(`/no-access`)은 여기서 하지 않는다.** 그것은 DB 를 읽어야 하고, 미들웨어는 모든 요청을
 *    지나므로 그 왕복을 매번 붙일 자리가 아니다. 셸의 게이트가 한다.
 */
const PUBLIC_PATHS = ["/login", "/no-access", "/auth"];

const isPublic = (pathname: string): boolean =>
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export async function middleware(request: NextRequest)
{
    const response = NextResponse.next({ request });
    const { url, anonKey } = supabaseConfig();

    const supabase = createServerClient(url, anonKey, {
        cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: (items) =>
            {
                for (const item of items)
                {
                    request.cookies.set(item.name, item.value);
                    response.cookies.set(item.name, item.value, item.options);
                }
            },
        },
    });

    const { data } = await supabase.auth.getUser();

    if (data.user === null && !isPublic(request.nextUrl.pathname))
    {
        const target = request.nextUrl.pathname + request.nextUrl.search;

        return NextResponse.redirect(new URL(paths.login(target), request.url));
    }

    return response;
}

export const config = {
    /**
     * 정적 자산과 이미지 최적화 경로는 지나지 않는다. 모든 요청에 Auth 왕복을 붙이면 그만큼 느려지고,
     * 그 경로에는 지킬 것도 없다.
     *
     * ⚠ **`/.well-known/workflow/` 도 지나지 않는다.** Workflow 의 큐가 워크플로와 스텝을 돌리려고 이 앱에
     *    스스로 보내는 요청이라 사람의 세션이 없다. 여기서 로그인으로 돌려보내면 실행이 첫 걸음에서 멈추고
     *    화면은 「답을 기다리는 중」에 머문다(스캐폴드를 세우며 실측). 그 경로의 인증은 Workflow 가 한다.
     */
    matcher: ["/((?!_next/static|_next/image|favicon.ico|\\.well-known/workflow/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)"],
};

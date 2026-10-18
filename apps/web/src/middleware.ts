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
// 뒤의 넷은 검색 엔진과 AI 가 읽는 파일이다(`app/robots.ts` · `app/sitemap.ts` · `app/llms.txt/route.ts` · `app/opengraph-image.tsx`)
const PUBLIC_PATHS = ["/login", "/no-access", "/auth", "/blog", "/docs", "/changelog", "/privacy", "/terms", "/robots.txt", "/sitemap.xml", "/llms.txt",
    "/opengraph-image",
    // 종목 · 부동산 화면(`app/(market)`)은 로그인하지 않아도 읽는다. 쓰기는 관문(`lib/action.ts`)이 막는다(INV-RESEARCH-01)
    "/stocks", "/real-estate",
    // 플러그인 화면의 목업. 개발 서버에서만 서고 프로덕션에서는 페이지가 404 를 낸다(`app/mock/plugin/page.tsx`)
    "/mock"];

/**
 * 쿠키가 아니라 Authorization 헤더로 인증하는 자리. MCP 클라이언트가 부른다.
 *
 * ⚠ **문을 여는 것이 아니라 안내에서 빼는 것이다.** 이 경로들은 자기 핸들러에서 토큰을 검증하고 401 을
 *    돌려준다(`app/api/mcp/route.ts`). 여기서 빼지 않으면 토큰을 제대로 들고 온 클라이언트가 로그인 화면의
 *    HTML 을 받고, OAuth 를 시작할 단서(401 과 그 헤더)를 얻지 못한다.
 * ⚠ **`/oauth/consent` 는 여기 없다.** 동의는 로그인한 사람이 하는 일이라 안내가 그대로 맞다.
 * ⚠ **모듈의 웹훅도 여기 둔다.** 쿠키가 아니라 서명으로 증명하고, 핸들러가 서명을 확인해 400 을 돌려준다.
 *    로그인으로 돌리면 보낸 쪽이 HTML 을 받고 며칠 동안 다시 보낸다.
 */
const BEARER_PATHS = [
    "/api/mcp",
    "/.well-known/oauth-protected-resource",
];

/**
 * 로그인하지 않아도 보이는 자리. 첫 화면(`/`)과 블로그 · 문서 · 새 소식, 개인정보 처리방침 · 이용약관이 공개다.
 * ⚠ 뿌리 주소는 정확히 `/` 만 공개다. 앞마디로 대조하면 모든 주소가 공개가 된다.
 */
const isPublic = (pathname: string): boolean =>
    pathname === "/" || PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export async function middleware(request: NextRequest)
{
    // 분석 이벤트는 로그인과 상관없이 PostHog 로 지나간다. 로그인으로 돌리면 방문자의 이벤트가 조용히 사라진다
    if (request.nextUrl.pathname.startsWith("/ingest")) return NextResponse.next(); // scaffold:module posthog

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

    if (data.user === null && !isPublic(request.nextUrl.pathname)
        && !BEARER_PATHS.some((prefix) => request.nextUrl.pathname.startsWith(prefix)))
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
     * ⚠ Search Console 의 소유권 확인 파일(`public/google<번호>.html`)도 지나지 않는다. 로그인으로 돌리면 Google 이 파일을
     *    읽지 못해 소유권 확인과 Google OAuth 브랜딩 인증이 함께 실패한다. 확인한 뒤에도 그 파일을 지우지 않는다.
     */
    matcher: ["/((?!_next/static|_next/image|favicon.ico|google[0-9a-f]+\\.html$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)"],
};

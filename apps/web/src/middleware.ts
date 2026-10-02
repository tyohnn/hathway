import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * 세션 토큰을 갱신한다. 그것만 한다.
 *
 * ⚠ **여기서 아무도 돌려보내지 않는다.** 이 앱은 읽기가 공개다(INV-RESEARCH-01). 로그인하지 않은 사람도 모든 화면을
 *    본다. 쓰기는 관문(`lib/action.ts`)이 요청마다 행위자를 확정해 막는다. 인가를 여기 넣지 말 것.
 * ⚠ **설정이 없으면 그냥 지나간다.** 인증 서버의 주소와 키가 없는 배포에서도 읽는 화면은 서야 한다. 그때 쓰기는
 *    관문이 「세션 없음」으로 끊는다.
 */
export async function middleware(request: NextRequest)
{
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const response = NextResponse.next({ request });

    if (url === undefined || url === "" || anonKey === undefined || anonKey === "")
    {
        return response;
    }

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

    // 만료가 가까운 토큰을 여기서 바꿔 쿠키에 다시 적는다. 결과로 판정하지 않는다
    await supabase.auth.getUser();

    return response;
}

export const config = {
    // 세션 쿠키가 있는 요청만 지난다. 로그인하지 않은 방문(대부분의 읽기)은 인증 서버를 부르지 않는다
    matcher: [
        {
            source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
            has: [{ type: "cookie", key: "sb-.*-auth-token.*" }],
        },
    ],
};

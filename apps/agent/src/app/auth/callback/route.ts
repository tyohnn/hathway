import { NextResponse, type NextRequest } from "next/server";

import { paths } from "@/lib/paths";
import { safeRedirect } from "@/lib/safeRedirect";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * OAuth 가 돌아오는 자리. 받은 코드를 세션으로 바꿔 쿠키에 적는다.
 *
 * ⚠ **여기가 세션이 생기는 유일한 자리다.** 라우트 핸들러는 쿠키를 쓸 수 있으므로 교환을 여기서 한다:
 *    서버 컴포넌트에서는 쿠키를 쓸 수 없어 세션이 적히지 않는다.
 * ⚠ **돌아갈 주소는 검사를 지난다**(`safeRedirect`). 코드와 함께 온 `next` 는 사람이 적을 수 있는 값이다.
 * ⚠ 실패하면 로그인 화면으로 돌려보내고 **무엇이 실패했는지는 화면의 어휘로만 말한다**. 토큰과 코드가 주소에
 *    남지 않게 하려는 것이다.
 */
export async function GET(request: NextRequest)
{
    const { searchParams, origin } = request.nextUrl;
    const code = searchParams.get("code");
    const next = safeRedirect(searchParams.get("next"), paths.home());

    if (code === null)
    {
        return NextResponse.redirect(new URL(paths.login(next, "failed"), origin));
    }

    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error !== null)
    {
        return NextResponse.redirect(new URL(paths.login(next, "failed"), origin));
    }

    return NextResponse.redirect(new URL(next, origin));
}

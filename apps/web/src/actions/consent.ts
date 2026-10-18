"use server";

import { redirect } from "next/navigation";

import { decideConsent } from "@/usecases/consent";

/**
 * OAuth 동의 결정.
 *
 * ⚠ **이 액션도 관문(`lib/action.ts`)을 지나지 않는다.** 이유는 세션 액션 셋과 같다. 여기서 하는 일은
 *    Supabase Auth 에 사람의 결정을 넘기고 그쪽이 준 주소로 보내는 것뿐이고, 도메인 데이터를 일절 만지지
 *    않는다. 행위자 확정은 화면이 이미 지났다(세션이 없으면 미들웨어가 로그인으로 보낸다).
 *
 * ⚠ **돌아갈 주소를 우리가 만들지 않는다.** Supabase 가 코드와 상태를 붙여 돌려준 주소를 그대로 쓴다.
 *    우리가 조립하면 리다이렉트 주소를 검증하는 책임이 이쪽으로 넘어오고, 그 검증은 인가 서버의 일이다.
 *
 * ⚠ `redirect()` 는 예외를 던져 흐름을 끊는다. `try` 로 감싸지 말 것.
 */
const decide = async (formData: FormData, decision: "approve" | "deny"): Promise<void> =>
{
    const authorizationId = String(formData.get("authorizationId") ?? "");

    if (authorizationId === "")
    {
        redirect("/oauth/consent?error=gone");
    }

    const target = await decideConsent(authorizationId, decision);

    if (target === null)
    {
        redirect("/oauth/consent?error=gone");
    }

    redirect(target);
};

export async function approveConsent(formData: FormData): Promise<void>
{
    await decide(formData, "approve");
}

export async function denyConsent(formData: FormData): Promise<void>
{
    await decide(formData, "deny");
}

import type { ReactNode } from "react";

import { AuthScreen } from "@hathway/blocks/auth-screen";

/** 이 앱의 이름. 로그인 화면의 머리와 동의 화면의 그림이 함께 읽는다 */
export const BRAND = { strong: "Hathway", rest: "Web" } as const;

/**
 * 로그인과 「허용되지 않은 계정」이 함께 쓰는 틀. 틀은 블록이 갖고 이 앱은 이름만 넘긴다.
 *
 * ⚠ **소개 문장을 두지 않는다.** 로그인 판의 제목과 단추가 할 일을 이미 말한다(`ux-writing` 「넣는 기준」).
 */
export function AuthShell({ children }: { readonly children: ReactNode })
{
    return (
        <AuthScreen
            brand={BRAND}
        >
            {children}
        </AuthScreen>
    );
}

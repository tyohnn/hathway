import type { ReactNode } from "react";

import { AuthScreen } from "@investment/blocks/auth-screen";

/** 로그인과 「들어갈 수 없는 계정」이 함께 쓰는 틀 */
export function AuthShell({ children }: { readonly children: ReactNode })
{
    return (
        <AuthScreen brand={{ strong: "숫자로 읽는", rest: "주식투자" }}>
            {children}
        </AuthScreen>
    );
}

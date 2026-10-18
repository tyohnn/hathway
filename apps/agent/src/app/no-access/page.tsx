import type { Metadata } from "next";

import { Button } from "@hathway/ui/components/button";

import { signOut } from "@/actions/session";
import { AuthShell } from "@/app/_components/AuthShell";

export const metadata: Metadata = { title: "들어갈 수 없는 계정" };

/**
 * 로그인은 했으나 이 앱을 쓸 수 있는 사람이 아니다 (`NotAppMember` 가 오는 자리).
 *
 * ⚠ **무엇이 모자란지는 말하지 않는다.** 「어느 표에 행이 없다」거나 「어떤 값이 아니다」를 적으면 바깥에서
 *    우리 판정을 읽는 셈이 된다. 사람이 할 수 있는 일 두 가지만 적는다: 다른 계정으로 들어오거나, 운영팀에
 *    알리거나.
 * ⚠ 다시 로그인하려면 **먼저 지금 세션을 닫아야 한다.** 닫지 않고 로그인 화면으로 보내면 미들웨어가 세션이
 *    있다고 보고 그대로 되돌려 보내, 사람은 같은 화면을 두 번 본다.
 */
export default function NoAccessPage()
{
    return (
        <AuthShell>
            <div className="mt-10 flex flex-col gap-1">
                <h2 className="text-base font-bold">이 계정으로는 들어갈 수 없어요</h2>
                <p className="text-muted-foreground text-sm leading-6">
                    초대받은 계정으로 다시 로그인하거나 관리자에게 문의해 주세요.
                </p>
                <form action={signOut} className="mt-4">
                    <Button type="submit" variant="outline" className="w-full">다른 계정으로 로그인</Button>
                </form>
            </div>
        </AuthShell>
    );
}

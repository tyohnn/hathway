import type { Metadata } from "next";

import { Button } from "@investment/ui/components/button";

import { signOut } from "@/actions/session";
import { AuthShell } from "@/app/_components/AuthShell";

export const metadata: Metadata = { title: "고칠 수 없는 계정" };

/** 로그인은 됐지만 명부에 없는 계정. 읽기는 그대로 되고 쓰기만 닫혀 있다 */
export default function NoAccessPage()
{
    return (
        <AuthShell>
            <div className="mt-10 flex flex-col gap-1">
                <h2 className="text-base font-bold">이 계정으로는 보드를 고칠 수 없어요</h2>
                <p className="text-muted-foreground text-sm leading-6">
                    다른 Google 계정으로 로그인했을 수 있어요. 초대받은 계정으로 다시 로그인해 주세요.
                </p>
                <form action={signOut} className="mt-4">
                    <Button type="submit" variant="outline" className="w-full">다른 계정으로 로그인</Button>
                </form>
            </div>
        </AuthShell>
    );
}

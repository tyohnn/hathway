import { Suspense } from "react";
import type { Metadata } from "next";

import { PageHeader } from "@hathway/blocks/page-header";

import { AccountBody } from "./_components/AccountBody";
import { AccountView } from "./_components/AccountView";

export const metadata: Metadata = { title: "내 계정" };

/**
 * 내 계정. 내가 누구로 들어와 있는지(이름 · 주소 · 팀 · 역할)를 보이고 이름 하나를 고친다. 주소는 로그인한 Google 계정의
 * 것이라 여기서 바꾸지 않는다.
 *
 * ⚠ 기다리는 얼굴은 같은 본문이다(`AccountBody` 의 `loading`). 카드 · 라벨 · 단추는 같은 자리에 서고 값 자리만 막대이며
 *    이름 칸과 단추는 꺼져 있다.
 */
export default function AccountPage()
{
    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="내 계정" />
            <Suspense fallback={<AccountBody loading />}>
                <AccountView />
            </Suspense>
        </div>
    );
}

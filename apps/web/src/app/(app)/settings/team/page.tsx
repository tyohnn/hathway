import { Suspense } from "react";
import type { Metadata } from "next";

import { ItemList } from "@investment/blocks/item-list";
import { PageHeader } from "@investment/blocks/page-header";

import { TeamList } from "./_components/TeamList";

export const metadata: Metadata = { title: "팀" };

/**
 * 지금 들어온 조직의 사람들. 같은 조직이면 누구나 목록을 보고, 초대 · 역할 · 내보내기는 소유주와 관리자에게만
 * 선다(INV-ACCESS-09). 단추가 없는 것은 모양이고, 막는 것은 액션이 부르는 판정이다.
 *
 * ⚠ **로그인한 사람의 화면이다.** 읽기가 공개인 이 앱에서 설정만 예외라 `appRead` 가 로그인으로 보낸다.
 * ⚠ 제목은 `<Suspense>` **밖**이다. 초대 폼은 관리할 수 있는 사람에게만 서서 데이터를 기다려야 하므로
 *    목록과 함께 안쪽에 있다. 기다리는 얼굴은 같은 목록의 `loading` 이다.
 */
export default function TeamPage()
{
    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="팀" />
            <Suspense fallback={<ItemList items={[]} loading />}>
                <TeamList />
            </Suspense>
        </div>
    );
}

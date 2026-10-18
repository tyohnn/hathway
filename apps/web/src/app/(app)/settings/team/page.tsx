import { Suspense } from "react";
import type { Metadata } from "next";

import { PageHeader } from "@hathway/blocks/page-header";

import { TeamBody } from "./_components/TeamBody";
import { TeamView } from "./_components/TeamView";

export const metadata: Metadata = { title: "팀" };

/**
 * 지금 들어온 조직의 사람들. 같은 조직이면 누구나 표와 인원을 보고, 초대 · 역할 · 팀에서 빼기는 소유주와 관리자에게만
 * 선다(INV-ACCESS-09). 단추가 없는 것은 모양이고, 막는 것은 액션이 부르는 판정이다.
 *
 * ⚠ 제목은 `<Suspense>` **밖**이다(쪽지 화면과 같다). 초대 카드는 관리할 수 있는 사람에게만 서서 데이터를 기다려야 하므로
 *    표와 함께 안쪽에 있다. 기다리는 얼굴은 같은 본문의 `loading` 이다.
 * ⚠ 설정 화면이라 셸의 우물 안에 선다(`settings/notifications` 와 같다). 화면을 통째로 쓰는 틀을 쓰지 않고 본문이 구른다.
 */
export default function TeamPage()
{
    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="팀" />
            <Suspense fallback={<TeamBody loading />}>
                <TeamView />
            </Suspense>
        </div>
    );
}

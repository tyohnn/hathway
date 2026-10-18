import { Suspense } from "react";
import type { Metadata } from "next";

import { PageHeader } from "@hathway/blocks/page-header";

import { HomeBody } from "./_components/HomeBody";
import { HomeView } from "./_components/HomeView";
import { LoopEntry } from "./_components/LoopEntry";

export const metadata: Metadata = { title: "홈" };

/**
 * 홈. 로그인하면 처음 오는 자리이고, 위에서부터 루프 진입점 → 처리할 것 → 최근이다(`/ia-design` 의 대시보드 해부도 3번).
 * 환영 문구 · 기능 소개 · 꾸미는 지표 카드를 두지 않는다. 사람은 여기서 어제 하던 일을 이어 가거나 새 일을 시작한다.
 *
 * ⚠ **제목과 루프 진입점은 `<Suspense>` 밖이다.** 누가 열어도 같아 빌드 때 구워 둔다. 기다리는 것은 처리할 것과 최근 두 칸이고,
 *    기다리는 얼굴은 같은 본문의 `loading` 이다(루트 `CLAUDE.md` 「정적 껍데기」).
 */
export default function HomePage()
{
    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="홈" />
            <LoopEntry />
            <Suspense fallback={<HomeBody plan={null} />}>
                <HomeView />
            </Suspense>
        </div>
    );
}

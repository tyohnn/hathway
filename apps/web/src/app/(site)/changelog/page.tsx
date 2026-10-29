import type { Metadata } from "next";

import { RELEASES } from "@/content/changelog";
import { RELEASE_BODIES } from "@/content/changelog/bodies";
import { newestFirst } from "@/content/collections";

import { ReleaseEntry } from "./_components/ReleaseEntry";

export const metadata: Metadata = { title: "새 소식" };

/**
 * 새 소식의 피드. 최근 판부터 판마다 날짜 칸 · 제목 · 큰 그림 · 본문이 위에서 아래로 줄을 선다(`ReleaseEntry`).
 * 판 하나만 보려면 제목을 눌러 `/changelog/[version]` 으로 간다.
 */
export default function ChangelogPage()
{
    return (
        <>
            <header className="changelog-head">
                <h1>새 소식</h1>
                <p className="site-lead">새로 생긴 기능과 달라진 점을 알려 드려요.</p>
            </header>
            {newestFirst(RELEASES).map((release) => (
                <ReleaseEntry key={release.version} release={release} Body={RELEASE_BODIES[release.version]} mode="feed" />
            ))}
        </>
    );
}

import type { Metadata } from "next";
import { ResearchBoardList } from "@/components/research/research-board-list";
import { readBoards, toResearchBoard } from "@/lib/boards";
import { viewer } from "@/lib/viewer";

// TODO: Cache Components 도입. 이 라우트를 정적 껍데기 규칙대로 고치면 이 줄을 지운다(SSO-63 이후 이슈).
export const instant = false;

export const metadata: Metadata = {
    title: "리서치 보드",
};


export default async function ResearchBoardListPage()
{
    const [boards, actor] = await Promise.all([readBoards("stocks"), viewer()]);

    return <ResearchBoardList theme="stocks" boards={boards.map(toResearchBoard)} signedIn={actor !== null} />;
}

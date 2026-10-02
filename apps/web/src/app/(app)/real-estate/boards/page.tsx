import type { Metadata } from "next";
import { ResearchBoardList } from "@/components/research/research-board-list";
import { readBoards, toResearchBoard } from "@/lib/boards";
import { viewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "리서치 보드 · 부동산" };

export const dynamic = "force-dynamic";

export default async function ResearchBoardListPage()
{
    const [boards, actor] = await Promise.all([readBoards("real-estate"), viewer()]);

    return <ResearchBoardList theme="real-estate" boards={boards.map(toResearchBoard)} signedIn={actor !== null} />;
}

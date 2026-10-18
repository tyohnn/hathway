import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResearchBoardEditor } from "@/components/research/research-board-editor";
import { boardAccess, readBoard, toResearchBoard } from "@/lib/boards";
import { viewer } from "@/lib/viewer";

// TODO: Cache Components 도입. 이 라우트를 정적 껍데기 규칙대로 고치면 이 줄을 지운다(SSO-63 이후 이슈).
export const instant = false;


export async function generateMetadata(
    props: PageProps<"/stocks/boards/[boardSlug]">,
): Promise<Metadata>
{
    const { boardSlug } = await props.params;
    const board = await readBoard(boardSlug);
    return { title: board ? board.title : "리서치 보드" };
}

export default async function ResearchBoardPage(props: PageProps<"/stocks/boards/[boardSlug]">)
{
    const { boardSlug } = await props.params;
    const [board, actor] = await Promise.all([readBoard(boardSlug), viewer()]);
    if (!board || board.theme !== "stocks") notFound();

    return (
        <ResearchBoardEditor
            initial={toResearchBoard(board)}
            version={board.version}
            access={boardAccess(actor, board)}
        />
    );
}

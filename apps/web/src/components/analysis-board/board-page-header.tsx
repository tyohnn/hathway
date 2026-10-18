import { PageHeader } from "@hathway/blocks/page-header";
import type { Tone } from "@hathway/blocks/tone";
import { StatusBadge } from "@hathway/blocks/status-badge";
import { DATA_STATE_LABELS, type AnalysisBoardMeta } from "@/lib/analysis";

const STATE_TONE: Record<AnalysisBoardMeta["dataState"], Tone> = {
    live: "success",
    partial: "warning",
    agent: "neutral",
};

export function BoardPageHeader({ board }: { board: AnalysisBoardMeta })
{
    return (
        <header className="mb-6">
            <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {board.step} / {8}
                </span>
                <StatusBadge tone={STATE_TONE[board.dataState]} label={DATA_STATE_LABELS[board.dataState]} />
            </div>
            {/* 제목보다 이 질문이 화면의 목적을 말한다. 그래서 머리의 설명 자리에 질문을 둔다 */}
            <PageHeader className="mt-1.5" title={board.title} description={board.question} />
            <p className="mt-0.5 text-sm text-muted-foreground">{board.description}</p>
        </header>
    );
}

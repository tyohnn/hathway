import { PageHeader } from "@investment/blocks/page-header";
import type { Tone } from "@investment/blocks/tone";
import { StatusBadge } from "@investment/blocks/status-badge";
import Link from "next/link";
import { DATA_STATE_LABELS, type AnalysisBoardMeta } from "@/lib/analysis";
import { isHiddenBookHref } from "@/lib/hidden-books";

const STATE_TONE: Record<AnalysisBoardMeta["dataState"], Tone> = {
    live: "success",
    partial: "warning",
    agent: "neutral",
};

export function BoardPageHeader({ board }: { board: AnalysisBoardMeta })
{
    // 숨긴 권으로 가는 딥링크는 404 가 되므로 걸러낸다 — lib/hidden-books.ts
    const textbooks = board.textbooks.filter((t) => !isHiddenBookHref(t.href));

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
            {textbooks.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="text-muted-foreground">교재</span>
                    {textbooks.map((t) => (
                        <Link
                            key={t.href}
                            href={t.href}
                            className="text-primary underline-offset-2 hover:underline"
                        >
                            {t.label}
                        </Link>
                    ))}
                </div>
            )}
        </header>
    );
}

import type { Tone } from "@investment/blocks/tone";
import { EmptyState } from "@investment/blocks/empty-state";
import { StatusBadge } from "@investment/blocks/status-badge";
import {
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@investment/ui/components/card";
import Link from "next/link";
import type { ReactNode } from "react";
import { TRUST_LABELS, type AnalysisWidgetMeta, type TrustLevel } from "@/lib/analysis";
import { isHiddenBookHref } from "@/lib/hidden-books";
import { MotionSurface } from "@/lib/motion/motion-card";

const TRUST_TONE: Record<TrustLevel, Tone> = {
    filing: "success",
    ir: "info",
    news: "warning",
    estimate: "neutral",
    secondary: "neutral",
};

/**
 * 분석 위젯 하나의 틀. 제목과 질문, 출처의 등급, 주장과 근거, 본문, 방법론 링크가 선다.
 *
 * 면과 여백과 모서리는 시스템의 `Card` 가 정한다. `MotionSurface` 는 그 카드에 올리는 움직임만 얹는다.
 */
export function WidgetShell({
    meta,
    claim,
    evidence,
    children,
    empty,
    emptyHint = "아직 모은 자료가 없어요",
}: {
    meta: AnalysisWidgetMeta;
    /** 런타임 주장 — 없으면 meta.claim */
    claim?: string;
    evidence?: string;
    children?: ReactNode;
    empty?: boolean;
    emptyHint?: string;
})
{
    const displayClaim = claim ?? meta.claim;
    // 교재 링크가 숨긴 책(lib/hidden-books.ts)을 가리키면 없는 화면으로 보내지 않고 뺀다
    const visibleTextbooks = meta.textbooks.filter((t) => !isHiddenBookHref(t.href));

    return (
        <MotionSurface>
            <CardHeader>
                <CardTitle role="heading" aria-level={3}>{meta.title}</CardTitle>
                {meta.question && <CardDescription>질문: {meta.question}</CardDescription>}
                <CardAction>
                    <StatusBadge tone={TRUST_TONE[meta.trust]} label={TRUST_LABELS[meta.trust]} className="shrink-0" />
                </CardAction>
            </CardHeader>

            <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                    <p className="text-sm leading-relaxed text-foreground">{displayClaim}</p>
                    {evidence && <p className="text-xs text-muted-foreground">근거: {evidence}</p>}
                </div>
                <div className="min-h-0 flex-1">
                    {empty ? <EmptyState title={emptyHint} /> : children}
                </div>
            </CardContent>

            {visibleTextbooks.length > 0 && (
                <CardFooter className="flex-wrap gap-x-3 gap-y-1 text-xs">
                    <span className="text-muted-foreground">교재</span>
                    {visibleTextbooks.map((t) => (
                        <Link
                            key={t.href}
                            href={t.href}
                            className="text-primary underline-offset-2 hover:underline"
                        >
                            {t.label}
                        </Link>
                    ))}
                </CardFooter>
            )}
        </MotionSurface>
    );
}

import type { Tone } from "@hathway/blocks/tone";
import { EmptyState } from "@hathway/blocks/empty-state";
import { StatusBadge } from "@hathway/blocks/status-badge";
import {
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@hathway/ui/components/card";
import type { ReactNode } from "react";
import { TRUST_LABELS, type AnalysisWidgetMeta, type TrustLevel } from "@/lib/analysis";
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
    /** 런타임 주장: 없으면 meta.claim */
    claim?: string;
    evidence?: string;
    children?: ReactNode;
    empty?: boolean;
    emptyHint?: string;
})
{
    const displayClaim = claim ?? meta.claim;

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
        </MotionSurface>
    );
}

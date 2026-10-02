import { StatusBadge } from "@investment/blocks/status-badge";
import type { Tone } from "@investment/blocks/tone";
import type { Verdict } from "@/lib/industry";

/** 채(sieve) 판정의 tone. 색은 블록(`StatusBadge`)이 시스템의 상태 토큰으로 그린다 */
export const VERDICT_TONE: Record<Verdict, Tone> = {
    통과: "success",
    통과철회: "warning",
    판정보류: "info",
    실패: "danger",
    범위밖: "neutral",
};

export function VerdictBadge({ verdict, count }: { verdict: Verdict; count?: number })
{
    return (
        <StatusBadge
            tone={VERDICT_TONE[verdict]}
            label={count === undefined ? verdict : `${verdict} ${count}`}
            className="shrink-0"
        />
    );
}

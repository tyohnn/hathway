import { SectionHeader } from "@investment/blocks/section-header";
import type { Tone } from "@investment/blocks/tone";
import { StatusBadge } from "@investment/blocks/status-badge";
import type { CorrectionChain } from "@investment/schema";
import { formatKoDate, dartUrl } from "./format";

/** 정정까지 걸린 날이 길수록 최초 공시를 덜 믿을 만했다는 뜻이다. 30일과 90일에서 tone 이 갈린다 */
function daysTone(days: number | null): Tone
{
    if (days === null) return "neutral";
    if (days >= 90) return "danger";
    if (days >= 30) return "warning";
    return "success";
}

export function CorrectionChains({ corrections }: { corrections: CorrectionChain[] })
{
    if (corrections.length === 0) return null;

    return (
        <section>
            <SectionHeader level={2} title="기재정정 체인" />
            <p className="mt-1 text-xs text-muted-foreground">
                정정본 → 원본 연결. 시차가 클수록 최초 공시의 신뢰도가 낮았다는 신호입니다.
            </p>
            <ul className="mt-3 space-y-2">
                {corrections.map((c) => (
                    <li
                        key={c.correction_rcept_no}
                        className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{c.base_report_nm}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                <a href={dartUrl(c.correction_rcept_no)} target="_blank" rel="noreferrer" className="hover:underline">
                                    정정본 {formatKoDate(c.correction_dt)}
                                </a>
                                <span>←</span>
                                {c.original_rcept_no ? (
                                    <a href={dartUrl(c.original_rcept_no)} target="_blank" rel="noreferrer" className="hover:underline">
                                        원본 {formatKoDate(c.original_dt)}
                                    </a>
                                ) : (
                                    <span>원본 미상</span>
                                )}
                            </div>
                        </div>
                        <StatusBadge
                            tone={daysTone(c.days_after_original)}
                            label={c.days_after_original === null ? "시차 미상" : `${c.days_after_original}일 후 정정`}
                            className="shrink-0 self-start sm:self-center"
                        />
                    </li>
                ))}
            </ul>
        </section>
    );
}

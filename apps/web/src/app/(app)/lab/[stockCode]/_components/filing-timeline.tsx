import { SectionHeader } from "@investment/blocks/section-header";
import { StatusBadge } from "@investment/blocks/status-badge";
import type { Filing } from "@investment/schema";
import { formatKoDate, dartUrl } from "./format";

export function FilingTimeline({ filings }: { filings: Filing[] })
{
    if (filings.length === 0) return null;

    return (
        <section>
            <SectionHeader level={2} title="최근 공시" count={filings.length} />
            <div className="mt-3 overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[560px] text-sm">
                    <thead className="bg-muted/50 text-xs text-muted-foreground">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium">접수일</th>
                            <th className="px-3 py-2 text-left font-medium">보고서명</th>
                            <th className="px-3 py-2 text-left font-medium">제출인</th>
                            <th className="px-3 py-2 text-left font-medium">비고</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filings.map((f) => (
                            <tr key={f.rcept_no} className="hover:bg-accent/30">
                                <td className="whitespace-nowrap px-3 py-2 align-top tabular-nums text-muted-foreground">
                                    {formatKoDate(f.rcept_dt)}
                                </td>
                                <td className="px-3 py-2 align-top">
                                    <a
                                        href={dartUrl(f.rcept_no)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="hover:text-primary hover:underline"
                                    >
                                        {f.report_nm}
                                    </a>
                                    {f.is_correction && (
                                        <StatusBadge tone="warning" label="기재정정" className="ml-2" />
                                    )}
                                </td>
                                <td className="whitespace-nowrap px-3 py-2 align-top text-muted-foreground">
                                    {f.flr_nm ?? "—"}
                                </td>
                                <td className="px-3 py-2 align-top text-muted-foreground">{f.rm ?? ""}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

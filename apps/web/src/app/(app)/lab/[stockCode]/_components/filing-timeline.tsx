"use client";

import { DataTableRoot, type ColumnSpec } from "@investment/blocks/data-table";
import { SectionHeader } from "@investment/blocks/section-header";
import type { Filing } from "@investment/schema";

import { dartUrl, filingRemark, formatKoDate } from "./format";

type FilingRow = {
    readonly id: string;
    readonly date: string;
    readonly report: string;
    readonly correction: string;
    readonly filer: string;
    readonly remark: string;
};

const COLUMNS: ReadonlyArray<ColumnSpec<FilingRow>> = [
    { key: "date", label: "접수일" },
    { key: "correction", label: "정정", kind: "badge", tone: () => "warning", sortable: false },
    { key: "report", label: "보고서명" },
    { key: "filer", label: "제출인" },
    { key: "remark", label: "비고" },
];

/**
 * 최근 공시의 표. 면과 줄과 글자는 블록(`DataTable`)이 정한다. 줄을 누르면 DART 원문이 새 창에 열린다.
 *
 * ⚠ 「비고」는 DART 가 한 글자(유 · 코 · 공 …)로 주는 값이라 풀어서 적는다(`filingRemark`).
 */
export function FilingTimeline({ filings }: { filings: Filing[] })
{
    if (filings.length === 0) return null;

    const rows: FilingRow[] = filings.map((filing) => ({
        id: filing.rcept_no,
        date: formatKoDate(filing.rcept_dt),
        report: filing.report_nm.trim(),
        correction: filing.is_correction ? "기재정정" : "",
        filer: filing.flr_nm ?? "—",
        remark: filingRemark(filing.rm),
    }));

    return (
        <section className="flex flex-col gap-3">
            <SectionHeader level={2} title="최근 공시" count={filings.length} />
            <DataTableRoot
                rows={rows}
                columns={COLUMNS}
                features={{ surface: "card", density: "compact", sorting: "single" }}
                defaultView={{ pagination: { pageIndex: 0, pageSize: 10 } }}
                onRowPress={(row) => window.open(dartUrl(row.id), "_blank", "noopener,noreferrer")}
            />
        </section>
    );
}

import type { BoardCard, CompanyRef, FinancialsView, KeyMetric, PeersView, ScreenRow } from "../investing/contract";

import { formatEok, formatMetric, formatPct, formatSignedPct, formatWon } from "./format";
import type { ContextItem } from "./state";

/**
 * 「대화에 추가」가 모델에게 붙이는 글. 화면이 보인 숫자를 마크다운 표로 옮긴다.
 *
 * 모델은 화면을 보지 못한다. 그래서 사람이 붙인 것이 무엇인지와 그 숫자의 출처를 글로 함께 싣는다. 숫자는 화면과 같은 꼴로 적어
 * 모델이 사람에게 되읽을 때 화면과 어긋나지 않게 한다.
 *
 * ⚠ 이 파일은 화면의 묶음에 들어간다. 타입과 `format.ts` 만 가져온다.
 */
const row = (cells: ReadonlyArray<string>): string => `| ${cells.join(" | ")} |`;

const table = (head: ReadonlyArray<string>, body: ReadonlyArray<ReadonlyArray<string>>): string =>
    [row(head), row(head.map(() => "---")), ...body.map(row)].join("\n");

const companyLabel = (company: CompanyRef): string => `${company.name}(${company.stockCode})`;

export const companyContext = (company: CompanyRef, headline: ReadonlyArray<KeyMetric>, source: string | null): ContextItem => ({
    key: `company:${company.stockCode}`,
    title: company.name,
    text: [
        `## ${companyLabel(company)}`,
        [company.market, company.sector].filter((each) => each !== null).join(" · "),
        ...headline.map((metric) => `- ${metric.label}: ${formatMetric(metric.value, metric.unit)}`),
        ...(source === null ? [] : [`출처: ${source}`]),
    ].filter((line) => line !== "").join("\n"),
});

export const financialsContext = (view: FinancialsView): ContextItem =>
{
    const labels = view.series[0]?.points.map((point) => point.label) ?? [];

    return {
        key: `financials:${view.company.stockCode}:${view.basis}`,
        title: `${view.company.name} ${view.basis === "quarter" ? "분기" : "연간"} 재무`,
        text: [
            `## ${companyLabel(view.company)} ${view.basis === "quarter" ? "분기" : "연간"} 재무`,
            table(
                ["계정", ...labels],
                view.series.map((series) => [
                    `${series.label}${series.unit === "won" ? "(억원)" : "(%)"}`,
                    ...labels.map((label) =>
                    {
                        const value = series.points.find((point) => point.label === label)?.value ?? null;

                        return series.unit === "won" ? formatEok(value) : formatPct(value);
                    }),
                ]),
            ),
            `출처: ${view.source}`,
        ].join("\n\n"),
    };
};

export const peersContext = (view: PeersView): ContextItem => ({
    key: `peers:${view.rows.map((each) => each.company.stockCode).join(",")}`,
    title: view.title,
    text: [
        `## ${view.title} (${view.period})`,
        table(
            ["종목", "매출(억원)", "성장률", "영업이익률", "ROE"],
            view.rows.map((each) => [
                each.focus ? `**${companyLabel(each.company)}**` : companyLabel(each.company),
                formatEok(each.revenue),
                formatSignedPct(each.revenueGrowthPct),
                formatPct(each.opmPct),
                formatPct(each.roePct),
            ]),
        ),
        `출처: ${view.source}`,
    ].join("\n\n"),
});

export const screenRowContext = (each: ScreenRow): ContextItem => ({
    key: `company:${each.company.stockCode}`,
    title: each.company.name,
    text: [
        `## ${companyLabel(each.company)}`,
        `- 매출: ${formatWon(each.revenue)}`,
        `- 3년 매출 성장률: ${formatSignedPct(each.revenueCagrPct)}`,
        `- 영업이익률: ${formatPct(each.opmPct)}`,
        `- ROE: ${formatPct(each.roePct)}`,
    ].join("\n"),
});

export const boardContext = (board: BoardCard): ContextItem => ({
    key: `board:${board.slug}`,
    title: board.title,
    text: `## 리서치 보드 「${board.title}」\n- 주소 이름: ${board.slug}\n- 위젯 ${board.widgets}개${board.updatedAt === null ? "" : ` · 고친 날 ${board.updatedAt}`}`,
});

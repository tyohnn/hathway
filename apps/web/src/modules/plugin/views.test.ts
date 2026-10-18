import { assert, describe, it } from "vitest";

import { valuate, type ValuationInput } from "@hathway/market/rules/valuation";

import {
    boardCard,
    boardMarkdown,
    companyRef,
    companyView,
    dartUrl,
    filingKindOf,
    filingsView,
    financialsView,
    MENTION_LIMIT,
    mentionItems,
    peersView,
    resourceOf,
    screenFilterChips,
    valuationView,
    wonText,
} from "./views";
import { board, ECOPRO_BM, FILINGS, KRAFTON, KRAFTON_ROWS, NETMARBLE, period } from "./testFixtures";

describe("종목 카드", () =>
{
    it("종목의 이름 · 코드 · 시장 · 업종 이름만 싣는다. 법인 코드와 대표자는 싣지 않는다", () =>
    {
        assert.deepStrictEqual(companyRef(KRAFTON), { stockCode: "259960", name: "크래프톤", market: "KOSPI", sector: companyRef(KRAFTON).sector });
        assert.isString(companyRef(KRAFTON).sector);
        assert.notProperty(companyRef(KRAFTON), "corp_code");
    });

    it("먼저 보여 줄 셋은 TTM 매출 · 영업이익률 · ROE 이고 한 해 전 TTM 과 견준다", () =>
    {
        const view = companyView(KRAFTON, KRAFTON_ROWS);

        assert.deepStrictEqual(view.headline.map((metric) => [metric.key, metric.value, metric.change]), [
            ["revenue", 1.54e12, 10],
            ["opm_pct", 41.5, 2.5],
            ["roe_pct", 20, 1],
        ]);
        assert.include(view.source, "2025 TTM");
    });

    it("사업보고서가 아직 없는 해의 TTM 은 한 해 전 TTM 과 열두 달 간격이 아니라 견주지 않는다", () =>
    {
        const view = companyView(KRAFTON, [...KRAFTON_ROWS, period(KRAFTON.corp_code, 2026, "TTM", { revenue: 1.6e12, opm_pct: 42, roe_pct: 21 })]);

        assert.strictEqual(view.headline[0]?.value, 1.6e12);
        assert.deepStrictEqual(view.headline.map((metric) => metric.change), [null, null, null]);
    });

    it("추이는 최근 다섯 해의 연간 매출과 영업이익이다", () =>
    {
        const view = companyView(KRAFTON, KRAFTON_ROWS);

        assert.deepStrictEqual(view.revenue.map((point) => point.label), ["2021", "2022", "2023", "2024", "2025"]);
        assert.strictEqual(view.operatingIncome.at(-1)?.value, 15 * 4e10);
    });

    it("TTM 이 없으면 가장 최근 연간으로 서고 출처가 그렇게 말한다", () =>
    {
        const view = companyView(KRAFTON, KRAFTON_ROWS.filter((row) => row.period_type === "A"));

        assert.strictEqual(view.headline[0]?.value, 15e11);
        assert.include(view.source, "2025 연간 · 연결");
    });

    it("매출이 빈 TTM 은 건너뛴다. 네 분기가 다 차지 않은 해의 TTM 은 매출이 비어 있다", () =>
    {
        const view = companyView(KRAFTON, [...KRAFTON_ROWS, period(KRAFTON.corp_code, 2026, "TTM", { revenue: null, opm_pct: null, roe_pct: null })]);

        assert.strictEqual(view.headline[0]?.value, 1.54e12);
        assert.include(view.source, "2025 TTM");
    });

    it("TTM 이 모두 비어 있으면 가장 최근 연간으로 선다", () =>
    {
        const emptied = KRAFTON_ROWS.map((row) => (row.period_type === "TTM" ? { ...row, values: { ...row.values, revenue: null } } : row));
        const view = companyView(KRAFTON, emptied);

        assert.strictEqual(view.headline[0]?.value, 15e11);
        assert.include(view.source, "2025 연간 · 연결");
    });

    it("재무가 없는 종목도 카드는 서고 값이 비어 있다", () =>
    {
        const view = companyView(ECOPRO_BM, []);

        assert.isTrue(view.headline.every((metric) => metric.value === null));
        assert.deepStrictEqual(view.revenue, []);
    });
});

describe("재무 추이", () =>
{
    it("분기는 25.1Q 꼴의 이름이고 고른 계열만 셋까지 싣는다", () =>
    {
        const view = financialsView(KRAFTON, KRAFTON_ROWS, "quarter", ["revenue", "operating_income", "opm_pct", "roe_pct"]);

        assert.deepStrictEqual(view.series.map((series) => series.key), ["revenue", "operating_income", "opm_pct"]);
        assert.deepStrictEqual(view.series[0]?.points.map((point) => point.label), ["25.1Q", "25.2Q"]);
    });

    it("계열을 고르지 않으면 매출과 영업이익이다", () =>
    {
        assert.deepStrictEqual(financialsView(KRAFTON, KRAFTON_ROWS, "annual", []).series.map((series) => series.label), ["매출", "영업이익"]);
    });
});

describe("피어 비교", () =>
{
    const rows = [
        { company: KRAFTON, financials: [{ bsns_year: 2024, fs_div: "CFS", revenue: 100, opm_pct: 30, roe_pct: 10, debt_ratio_pct: 20 }, { bsns_year: 2025, fs_div: "CFS", revenue: 120, opm_pct: 40, roe_pct: 15, debt_ratio_pct: 25 }] },
        { company: NETMARBLE, financials: [{ bsns_year: 2025, fs_div: "CFS", revenue: 200, opm_pct: 5, roe_pct: 3, debt_ratio_pct: 60 }] },
    ];

    it("주인공 줄이 굵게 서고, 매출 성장률은 한 해 전 매출과 견준다", () =>
    {
        const view = peersView(KRAFTON, 2025, rows);

        assert.deepStrictEqual(view.rows.map((row) => [row.company.name, row.focus, row.revenueGrowthPct]), [["크래프톤", true, 20], ["넷마블", false, null]]);
        assert.strictEqual(view.period, "2025 연간");
    });

    it("기준 해가 없으면 줄이 없다", () =>
    {
        assert.deepStrictEqual(peersView(KRAFTON, null, rows).rows, []);
    });
});

describe("적정가 카드", () =>
{
    const input: ValuationInput = {
        targetYear: 2028,
        sharesOutstanding: 1_000_000,
        method: "per",
        revenue: { bear: 8e8, base: 1e9, bull: 1.2e9 },
        netMarginPct: { bear: 10, base: 20, bull: 25 },
        multiple: { low: 10, mid: 15, high: 20 },
        currentPrice: 1250,
    };

    it("계산한 값과 가정의 줄과 주가의 출처를 싣는다", () =>
    {
        const view = valuationView(KRAFTON, input, valuate(input), { currentPrice: "다음금융 2026-10-17", shares: "DART" });

        assert.deepStrictEqual([view.fairPrice, view.buyPrice, view.gapToBuyPct, view.cells.length, view.refusal], [3000, 1000, 25, 9, null]);
        assert.strictEqual(view.currentPriceSource, "다음금융 2026-10-17");
        assert.include(view.assumptions.join(" "), "PER 10배 · 15배 · 20배");
    });

    it("계산을 거절하면 숫자 대신 까닭을 싣는다", () =>
    {
        const refused = { ...input, netMarginPct: { bear: -1, base: -1, bull: 1 } };
        const view = valuationView(KRAFTON, refused, valuate(refused), { currentPrice: null, shares: null });

        assert.deepStrictEqual([view.fairPrice, view.cells.length], [null, 0]);
        assert.include(view.refusal ?? "", "PSR");
    });

    it("PSR 이면 순이익률의 줄을 싣지 않는다", () =>
    {
        const psr = { ...input, method: "psr" as const };

        assert.notInclude(valuationView(KRAFTON, psr, valuate(psr), { currentPrice: null, shares: null }).assumptions.join(" "), "순이익률");
    });
});

describe("공시", () =>
{
    it("보고서 이름으로 정기 · 주요사항 · 지분 · 그 밖을 가른다", () =>
    {
        assert.deepStrictEqual(FILINGS.map((each) => filingKindOf(each.report_nm)), ["regular", "ownership", "major", "other"]);
    });

    it("고른 갈래만 남기고 원문은 DART 주소다", () =>
    {
        const view = filingsView(KRAFTON, FILINGS, "major", 10);

        assert.deepStrictEqual(view.items.map((item) => [item.title, item.url]), [["주요사항보고서(자기주식취득결정)", dartUrl("20260209000388")]]);
        assert.match(dartUrl("1"), /^https:\/\/dart\.fss\.or\.kr\//);
    });
});

describe("스크리너 조건", () =>
{
    it("받은 조건만 칩으로 서고 차례의 잣대가 마지막이다", () =>
    {
        assert.deepStrictEqual(screenFilterChips({ minOpmPct: 20, sortBy: "revenueCagr", limit: 10 }, 2025), ["2025 연간", "영업이익률 ≥ 20%", "3년 매출 CAGR 순"]);
    });
});

describe("보드와 멘션", () =>
{
    it("보드 카드는 테넌트와 만든 사람을 싣지 않는다", () =>
    {
        const card = boardCard(board("b1", "2", "크래프톤 분석"));

        assert.deepStrictEqual(card, { slug: "b1", title: "크래프톤 분석", theme: "stocks", widgets: 1, updatedAt: null });
    });

    it("멘션은 종목이 먼저이고 보드는 제목으로 찾는다", () =>
    {
        const items = mentionItems([{ stock_code: "259960", name: "크래프톤", market: "KOSPI", sector_code: "5821" }], [board("b1", "2", "크래프톤 분석"), board("b2", "2", "이차전지")], "크래프톤");

        assert.deepStrictEqual(items.map((item) => item.uri), ["company://259960", "board://b1"]);
    });

    it("멘션은 스무 개까지다", () =>
    {
        const boards = Array.from({ length: MENTION_LIMIT + 5 }, (_, index) => board(`b${index}`, "2", `보드 ${index}`));

        assert.strictEqual(mentionItems([], boards, "").length, MENTION_LIMIT);
    });

    it("자원 주소는 모양이 맞을 때만 읽는다", () =>
    {
        assert.deepStrictEqual(resourceOf("company://259960"), { kind: "company", key: "259960" });
        assert.deepStrictEqual(resourceOf("board://b1"), { kind: "board", key: "b1" });
        assert.isNull(resourceOf("company://../x"));
        assert.isNull(resourceOf("note://1"));
    });

    it("보드의 글은 그룹과 노트의 제목과 본문이다", () =>
    {
        assert.strictEqual(boardMarkdown(board("b1", "2", "크래프톤 분석")), "# 크래프톤 분석\n\n## 크래프톤\n\n### 요약\n\n해자가 있다");
    });
});

describe("모델이 읽는 금액", () =>
{
    it("조 · 억 · 만 · 원으로 줄인다", () =>
    {
        assert.deepStrictEqual([wonText(1.54e12), wonText(3.925e11), wonText(12_340_000), wonText(980), wonText(null)], ["1.5조", "3,925억", "1,234만", "980원", "–"]);
        assert.strictEqual(wonText(-2e8), "-2억");
    });
});

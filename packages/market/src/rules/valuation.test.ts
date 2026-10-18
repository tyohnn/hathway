import { describe, expect, it } from "vitest";

import { valuate, type ValuationInput } from "./valuation.ts";

/**
 * 적정가 계산(교재 10장 C2 의 5단계 · 9칸과 2장 A2 의 ÷3). 입력은 모델이 대화에서 세운 시나리오이고, 여기서는 곱하고 나누기만 한다.
 */
const INPUT: ValuationInput = {
    targetYear: 2028,
    sharesOutstanding: 1_000_000,
    method: "per",
    revenue: { bear: 800_000_000, base: 1_000_000_000, bull: 1_200_000_000 },
    netMarginPct: { bear: 10, base: 20, bull: 25 },
    multiple: { low: 10, mid: 15, high: 20 },
};

const valued = (input: ValuationInput) =>
{
    const outcome = valuate(input);

    if (outcome._tag !== "Valued")
    {
        throw new Error(`계산을 거절했다: ${outcome.reason}`);
    }

    return outcome;
};

describe("적정가", () =>
{
    it("적정가는 목표 해의 순이익에 PER 을 곱하고 발행주식수로 나눈 값이다", () =>
    {
        // 순이익 2억 × PER 15 ÷ 100만 주 = 3,000원
        expect(valued(INPUT).fairPrice).toBe(3000);
    });

    it("순이익은 목표 해의 매출에 순이익률을 곱해 얻는다", () =>
    {
        expect(valued(INPUT).netIncome).toEqual({ bear: 80_000_000, base: 200_000_000, bull: 300_000_000 });
    });

    it("매수가는 적정가를 3으로 나눈 값이다", () =>
    {
        expect(valued(INPUT).buyPrice).toBe(1000);
    });

    it("9칸은 매출 세 갈래와 PER 세 갈래를 곱한 것이고 기본 칸은 base × mid 다", () =>
    {
        const outcome = valued(INPUT);
        const at = (revenueCase: string, perCase: string) =>
            outcome.cells.find((cell) => cell.revenueCase === revenueCase && cell.perCase === perCase)?.fairPrice;

        expect(outcome.cells.map((cell) => `${cell.revenueCase}×${cell.perCase}`)).toEqual([
            "bear×low", "bear×mid", "bear×high", "base×low", "base×mid", "base×high", "bull×low", "bull×mid", "bull×high",
        ]);
        // 순이익 8천만 × 10 ÷ 100만 = 800원, 3억 × 20 ÷ 100만 = 6,000원
        expect([at("bear", "low"), at("bull", "high")]).toEqual([800, 6000]);
        expect(at("base", "mid")).toBe(outcome.fairPrice);
    });

    it("순이익이 0 이하면 PER 로 계산하지 않고 PSR 로 계산하라고 알린다", () =>
    {
        const loss = valuate({ ...INPUT, netMarginPct: { bear: -10, base: 0, bull: 5 } });

        expect(loss).toEqual({ _tag: "Refused", reason: "use-psr" });

        // 기본 갈래가 흑자면 계산하고, 적자인 갈래의 칸만 비운다
        const bearLoss = valued({ ...INPUT, netMarginPct: { bear: -5, base: 20, bull: 25 } });

        expect(bearLoss.cells.filter((cell) => cell.revenueCase === "bear").map((cell) => cell.fairPrice)).toEqual([null, null, null]);
        expect(bearLoss.fairPrice).toBe(3000);
    });

    it("PSR 이면 적정가는 매출에 PSR 을 곱하고 발행주식수로 나눈 값이다", () =>
    {
        // 적자여도 매출로 잰다. 매출 10억 × PSR 2 ÷ 100만 주 = 2,000원
        const outcome = valued({ ...INPUT, method: "psr", netMarginPct: { bear: -10, base: -5, bull: 0 }, multiple: { low: 1, mid: 2, high: 3 } });

        expect(outcome.fairPrice).toBe(2000);
        expect(outcome.cells.find((cell) => cell.revenueCase === "bull" && cell.perCase === "high")?.fairPrice).toBe(3600);
    });

    it("발행주식수가 없거나 0 이하면 계산을 거절한다", () =>
    {
        for (const sharesOutstanding of [0, -1, Number.NaN])
        {
            expect(valuate({ ...INPUT, sharesOutstanding })).toEqual({ _tag: "Refused", reason: "no-shares" });
        }
    });

    it("금액은 원 단위 정수로 내린다", () =>
    {
        // 순이익 2억 × 15 ÷ 70만 주 = 4,285.71…원, 매수가는 1,428.57…원
        const outcome = valued({ ...INPUT, sharesOutstanding: 700_000 });

        expect([outcome.fairPrice, outcome.buyPrice]).toEqual([4285, 1428]);
        expect(outcome.cells.every((cell) => cell.fairPrice === null || Number.isInteger(cell.fairPrice))).toBe(true);
    });

    it("오늘 주가가 있으면 매수가 대비 거리를 퍼센트로 내고 없으면 null 이다", () =>
    {
        // 매수가 1,000원, 오늘 1,250원이면 25% 위다
        expect(valued({ ...INPUT, currentPrice: 1250 }).gapToBuyPct).toBe(25);
        expect(valued({ ...INPUT, currentPrice: 800 }).gapToBuyPct).toBe(-20);
        expect(valued(INPUT).gapToBuyPct).toBeNull();
        expect(valued({ ...INPUT, currentPrice: null }).gapToBuyPct).toBeNull();
    });
});

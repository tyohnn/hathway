/**
 * 적정가 계산. 교재 10장(C2)의 5단계와 9칸, 2장(A2)의 「매수가는 적정가의 3분의 1」을 옮긴 것이다.
 *
 * 매출 · 순이익률 · 배수의 세 갈래는 모델이 대화에서 세운 시나리오이고, 이 함수는 곱하고 나누기만 한다.
 * 추정을 여기서 하지 않는다. 같은 입력이면 같은 답이 나와야 사람이 갈래 하나를 바꿔 보며 비교할 수 있다.
 *
 * ⚠ **금액은 원 단위 정수로 내린다.** 적정가는 칸마다 내리고, 매수가는 내린 적정가를 다시 3으로 나눠 내린다.
 * ⚠ **이익이 0 이하인 갈래는 칸을 비운다.** 음수 PER 을 곱하면 음수 주가가 나온다. 기본 갈래가 그렇다면 PER 로
 *    계산하지 않고 PSR 로 다시 하라고 알린다(교재 12장 C4).
 * ⚠ 주가와 발행주식수는 DB 에 없다. 부르는 쪽이 웹에서 받아 넣고 출처를 따로 적는다.
 */
type Cases = { readonly bear: number; readonly base: number; readonly bull: number };

type Multiples = { readonly low: number; readonly mid: number; readonly high: number };

export type RevenueCase = keyof Cases;

export type MultipleCase = keyof Multiples;

export type ValuationMethod = "per" | "psr";

export interface ValuationInput
{
    readonly targetYear: number;
    readonly sharesOutstanding: number;
    readonly method: ValuationMethod;
    /** 목표 해의 매출(원) */
    readonly revenue: Cases;
    /** 목표 해의 순이익률(퍼센트 수). PSR 이면 쓰지 않는다 */
    readonly netMarginPct: Cases;
    /** PER 또는 PSR 의 배수 */
    readonly multiple: Multiples;
    readonly currentPrice?: number | null;
}

export interface ValuationCell
{
    readonly revenueCase: RevenueCase;
    readonly perCase: MultipleCase;
    readonly fairPrice: number | null;
}

/** 계산을 거절한 까닭. 사람에게 보일 글은 부르는 쪽이 고른다 */
export type ValuationRefusal = "use-psr" | "no-shares";

export type ValuationOutcome =
    | {
        readonly _tag: "Valued";
        /** 기본 칸(base × mid)의 적정가 */
        readonly fairPrice: number | null;
        readonly buyPrice: number | null;
        /** (오늘 주가 − 매수가) ÷ 매수가 × 100. 소수 첫째 자리까지 */
        readonly gapToBuyPct: number | null;
        readonly netIncome: Cases;
        readonly cells: ReadonlyArray<ValuationCell>;
    }
    | { readonly _tag: "Refused"; readonly reason: ValuationRefusal };

const REVENUE_CASES: ReadonlyArray<RevenueCase> = ["bear", "base", "bull"];

const MULTIPLE_CASES: ReadonlyArray<MultipleCase> = ["low", "mid", "high"];

const gapOf = (currentPrice: number | null | undefined, buyPrice: number | null): number | null =>
{
    if (currentPrice === null || currentPrice === undefined || !Number.isFinite(currentPrice) || buyPrice === null || buyPrice <= 0)
    {
        return null;
    }

    return Math.round((currentPrice - buyPrice) / buyPrice * 1000) / 10;
};

export const valuate = (input: ValuationInput): ValuationOutcome =>
{
    if (!Number.isFinite(input.sharesOutstanding) || input.sharesOutstanding <= 0)
    {
        return { _tag: "Refused", reason: "no-shares" };
    }

    const net = (key: RevenueCase): number => input.revenue[key] * input.netMarginPct[key] / 100;
    const netIncome = { bear: net("bear"), base: net("base"), bull: net("bull") };

    if (input.method === "per" && netIncome.base <= 0)
    {
        return { _tag: "Refused", reason: "use-psr" };
    }

    // PER 은 이익에, PSR 은 매출에 배수를 곱한다
    const earningsOf = (revenueCase: RevenueCase): number =>
        (input.method === "psr" ? input.revenue[revenueCase] : netIncome[revenueCase]);
    const priceOf = (revenueCase: RevenueCase, perCase: MultipleCase): number | null =>
        (earningsOf(revenueCase) <= 0 ? null : Math.floor(earningsOf(revenueCase) * input.multiple[perCase] / input.sharesOutstanding));
    const cells = REVENUE_CASES.flatMap((revenueCase) =>
        MULTIPLE_CASES.map((perCase) => ({ revenueCase, perCase, fairPrice: priceOf(revenueCase, perCase) })));
    const fairPrice = priceOf("base", "mid");
    const buyPrice = fairPrice === null ? null : Math.floor(fairPrice / 3);

    return { _tag: "Valued", fairPrice, buyPrice, gapToBuyPct: gapOf(input.currentPrice, buyPrice), netIncome, cells };
};

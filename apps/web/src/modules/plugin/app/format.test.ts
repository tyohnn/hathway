import { describe, expect, it } from "vitest";

import { formatChange, formatDay, formatEok, formatPct, formatPrice, formatSignedPct, formatWon, toneOf } from "./format";

describe("formatWon", () =>
{
    it("조 아래를 억으로 이어 쓴다", () =>
    {
        expect(formatWon(2_709_800_000_000)).toBe("2조 7,098억원");
    });

    it("억이 0 이면 조만 쓰고, 반올림해 1만 억이 되면 조를 올린다", () =>
    {
        expect(formatWon(3_000_000_000_000)).toBe("3조원");
        expect(formatWon(1_999_999_000_000)).toBe("2조원");
    });

    it("compact 이면 큰 단위 하나로 줄인다", () =>
    {
        expect(formatWon(2_709_800_000_000, { compact: true })).toBe("2.7조원");
        expect(formatWon(12_345_000_000_000, { compact: true })).toBe("12조원");
        expect(formatWon(345_600_000_000, { compact: true })).toBe("3,456억원");
    });

    it("1조 아래는 억, 1억 아래는 만원, 그 아래는 원이다", () =>
    {
        expect(formatWon(345_600_000_000)).toBe("3,456억원");
        expect(formatWon(32_000_000)).toBe("3,200만원");
        expect(formatWon(5_300)).toBe("5,300원");
    });

    it("음수에는 빼기 기호를 붙인다", () =>
    {
        expect(formatWon(-12_300_000_000)).toBe("−123억원");
    });

    it("값이 없으면 대시다. 0 과 섞지 않는다", () =>
    {
        expect(formatWon(null)).toBe("–");
        expect(formatWon(0)).toBe("0원");
    });
});

describe("표와 가격", () =>
{
    it("표의 칸은 억 단위 숫자만 쓴다", () =>
    {
        expect(formatEok(2_709_800_000_000)).toBe("27,098");
        expect(formatEok(-4_200_000_000)).toBe("−42");
        expect(formatEok(null)).toBe("–");
    });

    it("주가는 원 단위에 쉼표를 찍는다", () =>
    {
        expect(formatPrice(253_000)).toBe("253,000원");
    });
});

describe("비율과 변화", () =>
{
    it("비율은 소수 한 자리다", () =>
    {
        expect(formatPct(41.23)).toBe("41.2%");
        expect(formatPct(null)).toBe("–");
    });

    it("부호를 붙인 비율은 오르면 +, 내리면 빼기 기호, 반올림해 0 이면 부호가 없다", () =>
    {
        expect(formatSignedPct(12.34)).toBe("+12.3%");
        expect(formatSignedPct(-8)).toBe("−8.0%");
        expect(formatSignedPct(0.04)).toBe("0.0%");
    });

    it("비율 지표의 변화는 %p, 금액 지표의 변화는 % 이고 늘 ▲ · ▼ 를 붙인다", () =>
    {
        expect(formatChange(2.14, "pct")).toBe("▲ 2.1%p");
        expect(formatChange(-12.3, "won")).toBe("▼ 12.3%");
        expect(formatChange(0.01, "pct")).toBe("– 0.0%p");
    });

    it("방향은 반올림한 값으로 정한다", () =>
    {
        expect(toneOf(0.04)).toBe("flat");
        expect(toneOf(0.06)).toBe("up");
        expect(toneOf(-3)).toBe("down");
        expect(toneOf(null)).toBe("flat");
    });
});

describe("formatDay", () =>
{
    it("기준 해와 같으면 연도를 빼고, 다르면 두 자리 연도를 붙인다", () =>
    {
        expect(formatDay("2026-10-14", 2026)).toBe("10.14");
        expect(formatDay("2025-03-11", 2026)).toBe("25.03.11");
    });
});

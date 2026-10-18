/**
 * 숫자를 화면의 글로 편다. 서버는 원 단위 정수와 퍼센트 수만 보내고(`investing/contract.ts`), 단위와 부호는 여기서 고른다.
 *
 * 국내 관례를 따른다. 큰 금액은 조 · 억으로 쓰고(「1조 2,345억원」), 표는 머리에 단위를 한 번 두고 칸에는 숫자만 쓴다.
 * 오름과 내림은 색만으로 말하지 않는다. 늘 부호나 ▲ · ▼ 를 함께 붙인다.
 *
 * ⚠ **값이 없으면 「–」다.** 0 과 없음을 섞지 않는다.
 * ⚠ 이 파일은 화면의 묶음에 들어간다. 아무것도 import 하지 않는다.
 */
export const EMPTY = "–";

const JO = 1_000_000_000_000;
const EOK = 100_000_000;
const MAN = 10_000;

/** 음수 부호. 하이픈보다 숫자 높이에 맞는 빼기 기호를 쓴다 */
const MINUS = "−";

const grouped = (value: number, digits = 0): string =>
    value.toLocaleString("ko-KR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const signOf = (value: number): string => (value < 0 ? MINUS : "");

/**
 * 원 단위 금액을 조 · 억으로. `compact` 이면 큰 단위 하나로 줄인다(「2.7조원」).
 *
 *   formatWon(2_709_800_000_000) → 「2조 7,098억원」
 *   formatWon(2_709_800_000_000, { compact: true }) → 「2.7조원」
 */
export const formatWon = (value: number | null, options: { readonly compact?: boolean } = {}): string =>
{
    if (value === null || !Number.isFinite(value))
    {
        return EMPTY;
    }

    const sign = signOf(value);
    const size = Math.abs(value);

    if (size >= JO)
    {
        if (options.compact === true)
        {
            return `${sign}${grouped(Math.round(size / JO * 10) / 10, size >= 10 * JO ? 0 : 1)}조원`;
        }

        const jo = Math.floor(size / JO);
        const eok = Math.round((size - jo * JO) / EOK);

        // 억을 반올림해 1만 억이 되면 조를 하나 올린다
        return eok >= 10_000 ? `${sign}${grouped(jo + 1)}조원` : eok === 0 ? `${sign}${grouped(jo)}조원` : `${sign}${grouped(jo)}조 ${grouped(eok)}억원`;
    }

    if (size >= EOK)
    {
        return `${sign}${grouped(Math.round(size / EOK))}억원`;
    }

    if (size >= MAN)
    {
        return `${sign}${grouped(Math.round(size / MAN))}만원`;
    }

    return `${sign}${grouped(Math.round(size))}원`;
};

/** 표의 칸. 머리에 「(억원)」을 두고 칸에는 억 단위 숫자만 쓴다 */
export const formatEok = (value: number | null): string =>
    (value === null || !Number.isFinite(value) ? EMPTY : `${signOf(value)}${grouped(Math.round(Math.abs(value) / EOK))}`);

/** 주가 같은 원 단위 값. 「253,000원」 */
export const formatPrice = (value: number | null): string =>
    (value === null || !Number.isFinite(value) ? EMPTY : `${signOf(value)}${grouped(Math.round(Math.abs(value)))}원`);

/** 비율. 「12.3%」 */
export const formatPct = (value: number | null, digits = 1): string =>
    (value === null || !Number.isFinite(value) ? EMPTY : `${signOf(value)}${grouped(Math.abs(value), digits)}%`);

/** 부호를 붙인 비율. 「+12.3%」 · 「−8.0%」. 성장률처럼 오르내림이 뜻인 칸에 쓴다 */
export const formatSignedPct = (value: number | null, digits = 1): string =>
{
    if (value === null || !Number.isFinite(value))
    {
        return EMPTY;
    }

    const rounded = Number(Math.abs(value).toFixed(digits));

    return rounded === 0 ? `${grouped(0, digits)}%` : `${value > 0 ? "+" : MINUS}${grouped(rounded, digits)}%`;
};

export type Tone = "up" | "down" | "flat";

/** 값의 방향. 좋고 나쁨이 아니라 오름과 내림이다. 반올림해 0 이면 같음이다 */
export const toneOf = (value: number | null, digits = 1): Tone =>
{
    if (value === null || !Number.isFinite(value))
    {
        return "flat";
    }

    const rounded = Number(value.toFixed(digits));

    return rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
};

/**
 * 한 해 전 대비 변화. 비율 지표는 퍼센트 포인트(「▲ 2.1%p」), 금액 지표는 퍼센트(「▲ 12.3%」)다.
 * 같으면 「– 0.0%p」처럼 화살표 없이 쓴다.
 */
export const formatChange = (value: number | null, unit: "won" | "pct", digits = 1): string =>
{
    if (value === null || !Number.isFinite(value))
    {
        return EMPTY;
    }

    const tone = toneOf(value, digits);
    const mark = tone === "up" ? "▲" : tone === "down" ? "▼" : "–";

    return `${mark} ${grouped(Math.abs(Number(value.toFixed(digits))), digits)}${unit === "pct" ? "%p" : "%"}`;
};

/** 지표 하나의 값. 금액이면 조 · 억, 비율이면 % */
export const formatMetric = (value: number | null, unit: "won" | "pct", options: { readonly compact?: boolean } = {}): string =>
    (unit === "won" ? formatWon(value, options) : formatPct(value));

/** 「2026-10-14」 → 「10.14」. 올해가 아니면 「25.10.14」 */
export const formatDay = (date: string, thisYear: number | null = null): string =>
{
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);

    if (match === null)
    {
        return date;
    }

    const [, year, month, day] = match;

    return thisYear !== null && Number(year) === thisYear ? `${month}.${day}` : `${year?.slice(2)}.${month}.${day}`;
};

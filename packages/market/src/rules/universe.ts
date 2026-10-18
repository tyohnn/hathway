import type { Company } from "@hathway/schema";

import type { CompanyIndexRow, MemberFinancials } from "../domain/rows.ts";
import { cagrPct } from "./growth.ts";

/**
 * 여러 회사를 훑는 규칙 셋. 종목 찾기 · 피어 후보 · 스크리너다.
 *
 * ⚠ **업종 코드는 앞 세 자리로 맞춘다.** `sector_code` 는 KSIC 이고 깊이가 제각각이라(게임만 해도 `582` · `5821` ·
 *    `58211` · `58212`) 그대로 같은지 보면 피어가 통째로 빠진다. 후보는 넓게 긁고, 고르는 일은 매출과 사람이 한다.
 * ⚠ **상장사만 본다.** 시장이 KOSPI 나 KOSDAQ 인 회사다. 비상장 · 상장폐지 · KONEX 는 피어와 스크리너에 서지 않는다.
 */
const LISTED = new Set(["KOSPI", "KOSDAQ"]);

const PEER_PREFIX = 3;

const normalized = (value: string): string => value.replace(/\s+/g, "").toLowerCase();

/** 큰 것이 먼저, 값이 없는 것은 맨 뒤다. 둘 다 없으면 받은 차례를 지킨다 */
const descending = (a: number | null, b: number | null): number =>
    (a === b ? 0 : a === null ? 1 : b === null ? -1 : b - a);

export const isListed = (market: string | null): boolean => market !== null && LISTED.has(market);

/** 종목코드가 같으면 그 하나, 아니면 이름으로 찾는다. 이름이 그 말로 시작하는 것이 먼저고 그다음 이름순이다 */
export const findCompanies = (
    index: ReadonlyArray<CompanyIndexRow>,
    query: string,
    limit: number,
): ReadonlyArray<CompanyIndexRow> =>
{
    const needle = normalized(query);

    if (needle === "")
    {
        return [];
    }

    const exact = index.filter((row) => row.stock_code === needle);

    if (exact.length > 0)
    {
        return exact.slice(0, limit);
    }

    const rank = (row: CompanyIndexRow): number => (normalized(row.name).startsWith(needle) ? 0 : 1);

    return index
        .filter((row) => normalized(row.name).includes(needle))
        .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name, "ko"))
        .slice(0, limit);
};

/** 주인공과 업종 코드 앞 세 자리가 같은 상장사. 주인공은 빼고, 순서는 받은 그대로다 */
export const peerPoolOf = (
    index: ReadonlyArray<CompanyIndexRow>,
    focus: CompanyIndexRow,
): ReadonlyArray<CompanyIndexRow> =>
{
    const prefix = focus.sector_code?.trim().slice(0, PEER_PREFIX) ?? "";

    if (prefix.length < PEER_PREFIX)
    {
        return [];
    }

    return index.filter((row) =>
        row.stock_code !== focus.stock_code && isListed(row.market) && (row.sector_code ?? "").startsWith(prefix));
};

/** 같은 해 매출이 큰 순으로 고른다. 매출이 없는 회사는 뒤로 간다 */
export const pickPeers = <T extends { readonly revenue: number | null }>(candidates: ReadonlyArray<T>, limit: number): ReadonlyArray<T> =>
    [...candidates].sort((a, b) => descending(a.revenue, b.revenue)).slice(0, limit);

export type ScreenSort = "opm" | "roe" | "revenueCagr" | "revenue";

export interface ScreenFilters
{
    /** 업종 코드의 앞머리. 「582」면 게임 · 소프트웨어 갈래 전부다 */
    readonly sectorPrefix?: string;
    readonly market?: "KOSPI" | "KOSDAQ";
    readonly minOpmPct?: number;
    readonly minRoePct?: number;
    readonly minRevenueCagrPct?: number;
    readonly minRevenue?: number;
    readonly sortBy: ScreenSort;
    readonly limit: number;
}

export interface ScreenHit
{
    readonly company: Company;
    readonly revenue: number | null;
    readonly revenueCagrPct: number | null;
    readonly opmPct: number | null;
    readonly roePct: number | null;
}

/** CAGR 을 재는 햇수. 기준 해와 그 3년 전을 견준다 */
export const SCREEN_CAGR_YEARS = 3;

const atLeast = (value: number | null, floor: number | undefined): boolean =>
    floor === undefined || (value !== null && value >= floor);

const sortValue = (hit: ScreenHit, sortBy: ScreenSort): number | null =>
    (sortBy === "opm" ? hit.opmPct : sortBy === "roe" ? hit.roePct : sortBy === "revenueCagr" ? hit.revenueCagrPct : hit.revenue);

/**
 * 조건을 모두 지나는 상장사를 고른 잣대가 높은 순으로. `total` 은 한도로 자르기 전의 수다.
 *
 * ⚠ **기준 해의 재무가 없는 회사는 뺀다.** 지난해 숫자로 올해 줄에 서면 표 안에서 해가 섞인다.
 */
export const screenOf = (
    companies: ReadonlyArray<Company>,
    financials: ReadonlyMap<string, ReadonlyArray<MemberFinancials>>,
    filters: ScreenFilters,
    year: number,
): { readonly rows: ReadonlyArray<ScreenHit>; readonly total: number } =>
{
    const prefix = filters.sectorPrefix?.trim() ?? "";
    const hits = companies.flatMap((company): ReadonlyArray<ScreenHit> =>
    {
        if (!isListed(company.market) || (filters.market !== undefined && company.market !== filters.market)
            || !(company.sector_code ?? "").startsWith(prefix))
        {
            return [];
        }

        const rows = financials.get(company.corp_code) ?? [];
        const current = rows.find((row) => row.bsns_year === year);

        if (current === undefined)
        {
            return [];
        }

        const earlier = rows.find((row) => row.bsns_year === year - SCREEN_CAGR_YEARS);
        const hit: ScreenHit = {
            company,
            revenue: current.revenue,
            revenueCagrPct: cagrPct(earlier?.revenue ?? null, current.revenue, SCREEN_CAGR_YEARS),
            opmPct: current.opm_pct,
            roePct: current.roe_pct,
        };

        return atLeast(hit.opmPct, filters.minOpmPct) && atLeast(hit.roePct, filters.minRoePct)
            && atLeast(hit.revenueCagrPct, filters.minRevenueCagrPct) && atLeast(hit.revenue, filters.minRevenue)
            ? [hit]
            : [];
    });
    const sorted = [...hits].sort((a, b) => descending(sortValue(a, filters.sortBy), sortValue(b, filters.sortBy)));

    return { rows: sorted.slice(0, filters.limit), total: sorted.length };
};

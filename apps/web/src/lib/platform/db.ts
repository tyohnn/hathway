/**
 * 종목 · 재무 · 공시를 읽는 화면의 입구. 서버 컴포넌트는 여기의 함수만 부른다.
 *
 * 함수마다 유스케이스(`src/usecases/market.ts`) 하나를 돌린다. 읽는 조건과 차례는 포트(`@investment/market`)에,
 * 접고 고르는 판단은 그 패키지의 규칙에 있다. 여기에는 판단이 없다.
 *
 * ⚠ **서버 전용이다.** 클라이언트 컴포넌트는 타입만 `import type` 으로 가져간다. 접속 문자열과 저장소 키가 이 뒤에 있다.
 * ⚠ **표는 앱의 롤(`web_app`)이 `pg` 로 읽는다.** PostgREST 와 service role 을 지나지 않는다. 표를 새로 읽으려면
 *    포트에 메서드를 더하고 마이그레이션에 GRANT 를 더한다.
 * ⚠ **읽지 못하면 던진다.** 종목 화면은 숫자 없이 설 수 없다. 셸처럼 비어도 되는 자리는 부르는 쪽이 잡는다.
 */
import "server-only";

import type {
    AnnualSummary,
    Company,
    CorrectionChain,
    DartEvent,
    Filing,
    FilingSection,
    OwnershipTxn,
    TrackingFact,
} from "@investment/schema";
import type {
    DivisionCount,
    GuideFinPeriod as MarketGuideFinPeriod,
    MemberFinancials,
    NoteSectionListItem,
} from "@investment/market/domain/rows";

import { GUIDE_CONCEPTS, type GuideConcept } from "@/lib/company/guide-model";
import { runMarket } from "@/lib/marketRuntime";
import * as market from "@/usecases/market";

import type { CompanyIndex } from "./company-index";

export type { DivisionCount, MemberFinancials, NoteSectionListItem };

/** `getConceptSeries` 가 받는 개념. `fin_periods` 의 칸 이름 그대로라 오타는 컴파일에서 걸린다 */
export type FinPeriodConcept = GuideConcept;

/** 재무 격자가 쓰는 넓은 슬라이스. 없는 칸은 화면이 공칸으로 둔다 */
export type GuideFinValues = Partial<Record<GuideConcept, number | null>>;

export type GuideFinPeriod = Omit<MarketGuideFinPeriod, "values"> & { values: GuideFinValues };

type GuideFinGrid = { annual: GuideFinPeriod[]; quarters: GuideFinPeriod[] };

export const listCompanies = async (): Promise<Company[]> => [...await runMarket(market.companies())];

export const listCompanyIndex = async (): Promise<CompanyIndex[]> => [...await runMarket(market.companyIndex())];

export const getCompany = (stockCode: string): Promise<Company | null> => runMarket(market.company(stockCode));

export const getCompaniesByStockCodes = async (stockCodes: string[]): Promise<Company[]> =>
    [...await runMarket(market.companiesByStockCodes(stockCodes))];

export const getListedDivisionCounts = (): Promise<{ divisions: DivisionCount[]; totalListed: number }> =>
    runMarket(market.listedDivisionCounts());

export const getAnnualSummary = (corpCode: string): Promise<AnnualSummary[]> =>
    runMarket(market.annualSummary(corpCode));

export const getGuideFinGrid = (corpCode: string): Promise<GuideFinGrid> =>
    runMarket(market.guideFinGrid(corpCode, GUIDE_CONCEPTS));

export const getConceptSeries = (
    corpCode: string,
    concept: FinPeriodConcept,
): Promise<{ bsns_year: number; amount: number | null }[]> => runMarket(market.conceptSeries(corpCode, concept));

export const getAnnualByCorpCodes = (corpCodes: string[], years: number[]): Promise<Map<string, MemberFinancials[]>> =>
    runMarket(market.annualByCorpCodes(corpCodes, years));

export const getFilings = async (corpCode: string, limit?: number): Promise<Filing[]> =>
    [...await runMarket(market.filings(corpCode, limit))];

export const getThemedFilings = async (corpCode: string, limit?: number): Promise<Filing[]> =>
    [...await runMarket(market.themedFilings(corpCode, limit))];

export const getFilingByRceptNo = (rceptNo: string): Promise<Filing | null> =>
    runMarket(market.filingByRceptNo(rceptNo));

export const getCorrectionChains = async (corpCode: string, limit?: number): Promise<CorrectionChain[]> =>
    [...await runMarket(market.correctionChains(corpCode, limit))];

export const getEvents = async (corpCode: string): Promise<DartEvent[]> => [...await runMarket(market.events(corpCode))];

export const getOwnershipTxns = async (corpCode: string, limit?: number): Promise<OwnershipTxn[]> =>
    [...await runMarket(market.ownershipTxns(corpCode, limit))];

export const getTrackings = async (corpCode: string): Promise<TrackingFact[]> =>
    [...await runMarket(market.trackings(corpCode))];

export const getFilingSectionContent = (rceptNo: string, secNo: number): Promise<FilingSection | null> =>
    runMarket(market.filingSection(rceptNo, secNo));

export const getNoteSections = (corpCode: string, limit?: number): Promise<NoteSectionListItem[]> =>
    runMarket(market.noteSections(corpCode, limit));

/** 종목 화면이 한 번에 읽는 묶음. 없는 종목코드면 `null` 이다 */
export const getCompanyPageData = async (stockCode: string) =>
{
    const page = await runMarket(market.companyPage(stockCode, GUIDE_CONCEPTS));

    if (page === null)
    {
        return null;
    }

    return {
        ...page,
        filings: [...page.filings],
        corrections: [...page.corrections],
        events: [...page.events],
        trackings: [...page.trackings],
        ownershipTxns: [...page.ownershipTxns],
        themedFilings: [...page.themedFilings],
        guideFin: page.guideFin as GuideFinGrid,
    };
};

export type CompanyPageData = NonNullable<Awaited<ReturnType<typeof getCompanyPageData>>>;

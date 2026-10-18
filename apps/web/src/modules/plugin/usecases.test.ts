import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";
import { customerActor, otherCustomerActor } from "@hathway/access/testing/actor";
import { marketMemory } from "@hathway/market/testing/marketMemory";
import { boardStoreMemory } from "@hathway/research/testing/boardStoreMemory";

import type { SurfaceCall, SurfaceOutcome } from "@/extensions/McpSurface";
import type { McpClient } from "@/lib/mcp";
import { openBoard } from "@/usecases/research";

import { UI_COMPANY } from "./surface";
import { board, ECOPRO_BM, FILINGS, KRAFTON, KRAFTON_ROWS, NETMARBLE, PEARL, PEER_ROWS } from "./testFixtures";
import { callTool, readResource, type PluginConfig, type PluginStores } from "./usecases";

/**
 * 플러그인의 도구와 자원. 메모리 저장소로 도커 없이 잰다.
 *
 * ⚠ 계산과 고르기의 규칙 자체는 `packages/market` 과 `packages/research` 가 잰다. 여기서 보는 것은 **도구가 인자를 거르고,
 *    유스케이스를 지나고, 보드의 판정을 건너뛰지 않는가**다.
 */
const CONFIG: PluginConfig = { appHtml: "<!doctype html><title>틀</title>", newId: (prefix) => `${prefix}-test` };
const NOW = new Date("2026-10-18T03:00:00.000Z");
const OPENAI: McpClient = { modern: true, capabilities: {} };

const kim = customerActor("2");
const park = otherCustomerActor("4");

const call = (actor: Actor, name: string, args: Record<string, unknown> = {}): SurfaceCall => ({
    actor,
    name,
    args,
    meta: {},
    client: OPENAI,
    inputResponses: null,
    requestState: null,
    now: NOW,
});

const BOARDS = [board("kim-board", "2", "크래프톤 분석"), board("park-board", "3", "남의 보드")];

const run = <A>(program: Effect.Effect<A, unknown, PluginStores>) =>
    Effect.gen(function*()
    {
        const market = marketMemory({ companies: [KRAFTON, NETMARBLE, PEARL, ECOPRO_BM], periods: [...KRAFTON_ROWS, ...PEER_ROWS], filings: FILINGS });

        return yield* program.pipe(Effect.provide(Layer.mergeAll(market, yield* boardStoreMemory(BOARDS))));
    });

const ask = (actor: Actor, name: string, args: Record<string, unknown> = {}) => callTool(call(actor, name, args), CONFIG);

const result = (outcome: SurfaceOutcome): Record<string, unknown> => (outcome.kind === "result" ? outcome.result : {});

const structured = <T = Record<string, unknown>>(outcome: SurfaceOutcome): T => (result(outcome)["structuredContent"] ?? {}) as T;

const said = (outcome: SurfaceOutcome): string =>
    ((result(outcome)["content"] ?? []) as ReadonlyArray<{ text?: string }>).map((part) => part.text ?? "").join("\n");

const isError = (outcome: SurfaceOutcome): boolean => result(outcome)["isError"] === true;

const VALUE_ARGS = {
    stockCode: "259960",
    targetYear: 2028,
    revenue: { bear: 8e8, base: 1e9, bull: 1.2e9 },
    netMarginPct: { bear: 10, base: 20, bull: 25 },
    multiple: { low: 10, mid: 15, high: 20 },
    sharesOutstanding: 1_000_000,
    sharesSource: "DART 2025 사업보고서",
    currentPrice: 1250,
    currentPriceSource: "다음금융 2026-10-17",
};

describe("종목을 찾고 읽는 도구", () =>
{
    it.effect("이름으로 하나를 찾으면 종목코드를 글로 돌려주고, 여럿이면 사람에게 물으라고 한다", () =>
        run(Effect.gen(function*()
        {
            const one = yield* ask(kim, "find_company", { query: "크래프톤" });
            const none = yield* ask(kim, "find_company", { query: "없는회사" });

            assert.include(said(one), "259960");
            assert.include(said(one), "show_company");
            assert.isFalse(isError(none));
            assert.include(said(none), "맞는 종목이 없어요");
        })));

    it.effect("종목 요약은 화면에 CompanyView 를 싣고, 모델에게는 숫자 셋과 출처와 다음 걸음을 글로 준다", () =>
        run(Effect.gen(function*()
        {
            const outcome = yield* ask(kim, "show_company", { stockCode: "259960" });
            const view = structured<{ page: string; headline: ReadonlyArray<{ value: number | null }> }>(outcome);

            assert.strictEqual(view.page, "company");
            assert.strictEqual(view.headline[0]?.value, 1.54e12);
            assert.include(said(outcome), "1.5조");
            assert.include(said(outcome), "출처");
            assert.include(said(outcome), "투자 판단은 스스로");
        })));

    it.effect("모양이 틀린 종목코드와 없는 종목코드는 오류로 답하고 find_company 로 돌려보낸다", () =>
        run(Effect.gen(function*()
        {
            for (const stockCode of ["abc", "000000"])
            {
                const outcome = yield* ask(kim, "show_company", { stockCode });

                assert.isTrue(isError(outcome), stockCode);
                assert.include(said(outcome), "find_company");
            }
        })));

    it.effect("재무 추이는 분기를 고르면 분기로 선다", () =>
        run(Effect.gen(function*()
        {
            const view = structured<{ page: string; basis: string; series: ReadonlyArray<{ points: ReadonlyArray<unknown> }> }>(
                yield* ask(kim, "show_financials", { stockCode: "259960", basis: "quarter", series: ["revenue", "모르는칸"] }));

            assert.deepStrictEqual([view.page, view.basis, view.series.length, view.series[0]?.points.length], ["financials", "quarter", 1, 2]);
        })));

    it.effect("화면만 부르는 browse_company 는 고른 쪽의 화면 데이터를 돌려준다", () =>
        run(Effect.gen(function*()
        {
            const company = structured<{ page: string }>(yield* ask(kim, "browse_company", { stockCode: "259960", view: "company" }));
            const financials = structured<{ page: string }>(yield* ask(kim, "browse_company", { stockCode: "259960", view: "financials" }));

            assert.deepStrictEqual([company.page, financials.page], ["company", "financials"]);
        })));
});

describe("비교와 스크리너", () =>
{
    it.effect("피어는 업종 코드 앞 세 자리가 같은 상장사이고 다른 업종은 서지 않는다", () =>
        run(Effect.gen(function*()
        {
            const view = structured<{ rows: ReadonlyArray<{ company: { name: string }; focus: boolean }> }>(yield* ask(kim, "compare_peers", { stockCode: "259960" }));

            assert.deepStrictEqual(view.rows.map((row) => [row.company.name, row.focus]), [["크래프톤", true], ["넷마블", false], ["펄어비스", false]]);
        })));

    it.effect("사람이 이름을 댄 회사는 업종이 달라도 피어에 넣는다", () =>
        run(Effect.gen(function*()
        {
            const view = structured<{ rows: ReadonlyArray<{ company: { name: string } }> }>(
                yield* ask(kim, "compare_peers", { stockCode: "259960", withStockCodes: ["247540"], limit: 2 }));

            assert.deepStrictEqual(view.rows.map((row) => row.company.name), ["크래프톤", "에코프로비엠", "넷마블"]);
        })));

    it.effect("스크리너는 업종과 이익률 조건을 지난 상장사만 싣는다", () =>
        run(Effect.gen(function*()
        {
            const outcome = yield* ask(kim, "screen_stocks", { sectorPrefix: "582", minOpmPct: 3 });
            const view = structured<{ page: string; total: number; rows: ReadonlyArray<{ company: { name: string } }>; filters: ReadonlyArray<string> }>(outcome);

            assert.deepStrictEqual([view.page, view.total, view.rows.map((row) => row.company.name)], ["screen", 2, ["크래프톤", "넷마블"]]);
            assert.include(view.filters, "2025 연간");
        })));

    it.effect("스크리너 조건의 모양이 틀리면 오류로 답한다", () =>
        run(Effect.gen(function*()
        {
            assert.isTrue(isError(yield* ask(kim, "screen_stocks", { sectorPrefix: "게임" })));
        })));

    it.effect("공시는 고른 갈래만 싣고 원문 주소를 글에도 남긴다", () =>
        run(Effect.gen(function*()
        {
            const outcome = yield* ask(kim, "list_filings", { stockCode: "259960", kind: "ownership" });
            const view = structured<{ items: ReadonlyArray<{ kind: string }> }>(outcome);

            assert.deepStrictEqual(view.items.map((item) => item.kind), ["ownership"]);
            assert.include(said(outcome), "dart.fss.or.kr");
        })));
});

describe("적정가", () =>
{
    it.effect("모델이 넣은 가정으로 계산하고, 주가와 발행주식수의 출처를 카드에 남긴다", () =>
        run(Effect.gen(function*()
        {
            const outcome = yield* ask(kim, "value_company", VALUE_ARGS);
            const view = structured<{ page: string; fairPrice: number; buyPrice: number; gapToBuyPct: number; currentPriceSource: string; source: string }>(outcome);

            assert.deepStrictEqual([view.page, view.fairPrice, view.buyPrice, view.gapToBuyPct], ["valuation", 3000, 1000, 25]);
            assert.strictEqual(view.currentPriceSource, "다음금융 2026-10-17");
            assert.include(view.source, "DART 2025 사업보고서");
            assert.include(said(outcome), "매수가(÷3) 1,000원");
        })));

    it.effect("발행주식수가 빠지거나 숫자가 아니면 계산하지 않는다", () =>
        run(Effect.gen(function*()
        {
            const { sharesOutstanding: _dropped, ...withoutShares } = VALUE_ARGS;

            assert.isTrue(isError(yield* ask(kim, "value_company", withoutShares)));
            assert.isTrue(isError(yield* ask(kim, "value_company", { ...VALUE_ARGS, revenue: { bear: "많이", base: 1, bull: 2 } })));
        })));

    it.effect("기본 시나리오가 적자면 카드에 숫자 대신 PSR 로 하라는 까닭이 선다", () =>
        run(Effect.gen(function*()
        {
            const outcome = yield* ask(kim, "value_company", { ...VALUE_ARGS, netMarginPct: { bear: -5, base: -1, bull: 3 } });
            const view = structured<{ fairPrice: number | null; refusal: string | null }>(outcome);

            assert.isFalse(isError(outcome));
            assert.isNull(view.fairPrice);
            assert.include(view.refusal ?? "", "PSR");
        })));
});

describe("보드", () =>
{
    it.effect("홈과 서랍에는 이 사람의 테넌트 보드만 선다", () =>
        run(Effect.gen(function*()
        {
            const home = structured<{ page: string; boards: ReadonlyArray<{ slug: string }>; companies: ReadonlyArray<{ name: string }> }>(yield* ask(kim, "open_home"));
            const tray = structured<{ page: string; boards: ReadonlyArray<{ slug: string }> }>(yield* ask(park, "open_boards"));

            assert.deepStrictEqual([home.page, home.boards.map((each) => each.slug)], ["home", ["kim-board"]]);
            assert.deepStrictEqual(home.companies.map((each) => each.name), ["크래프톤", "에코프로비엠"]);
            assert.deepStrictEqual([tray.page, tray.boards.map((each) => each.slug)], ["boards", ["park-board"]]);
        })));

    it.effect("보드를 고르지 않고 담으면 그 종목을 단 새 보드를 열어 종목 이름의 그룹에 노트를 담는다", () =>
        run(Effect.gen(function*()
        {
            const outcome = yield* ask(kim, "save_to_board", { stockCode: "259960", title: "적정가 2028", body: "적정가 3,000원" });
            const saved = yield* openBoard("board-test");

            assert.isFalse(isError(outcome));
            assert.include(said(outcome), "크래프톤 분석");
            assert.strictEqual(saved?.tenantId, "2");
            assert.strictEqual(saved?.relatedStockCode, "259960");
            assert.deepStrictEqual(saved?.groups.map((group) => [group.title, group.widgets.map((widget) => widget.title)]), [["크래프톤", ["적정가 2028"]]]);
        })));

    it.effect("내 보드를 고르면 그 보드의 같은 그룹에 더한다", () =>
        run(Effect.gen(function*()
        {
            yield* ask(kim, "save_to_board", { stockCode: "259960", title: "적정가", body: "3,000원", boardSlug: "kim-board" });
            const saved = yield* openBoard("kim-board");

            assert.deepStrictEqual(saved?.groups[0]?.widgets.map((widget) => widget.title), ["요약", "적정가"]);
            assert.strictEqual(saved?.version, 2);
        })));

    it.effect("INV-RESEARCH-02 남의 테넌트 보드에는 담지 않고 없는 보드로 답한다", () =>
        run(Effect.gen(function*()
        {
            const outcome = yield* ask(kim, "save_to_board", { stockCode: "259960", title: "적정가", body: "3,000원", boardSlug: "park-board" });
            const untouched = yield* openBoard("park-board");

            assert.isTrue(isError(outcome));
            assert.include(said(outcome), "찾을 수 없어요");
            assert.strictEqual(untouched?.version, 1);
        })));
});

describe("멘션과 자원", () =>
{
    it.effect("멘션은 종목과 내 보드의 주소를 돌려준다", () =>
        run(Effect.gen(function*()
        {
            const items = structured<{ items: ReadonlyArray<{ uri: string }> }>(yield* ask(kim, "search_mentions", { query: "크래프톤" })).items;

            assert.deepStrictEqual(items.map((item) => item.uri), ["company://259960", "board://kim-board"]);
        })));

    it.effect("종목 주소를 읽으면 요약 글이, 화면 주소를 읽으면 구운 틀이 온다", () =>
        run(Effect.gen(function*()
        {
            const companyText = yield* readResource({ actor: kim, uri: "company://259960" }, CONFIG);
            const frame = yield* readResource({ actor: kim, uri: UI_COMPANY }, CONFIG);

            assert.include(String(companyText?.[0]?.["text"]), "크래프톤");
            assert.strictEqual(frame?.[0]?.["text"], CONFIG.appHtml);
        })));

    it.effect("남의 테넌트 보드와 모양이 틀린 주소는 없는 것으로 답한다", () =>
        run(Effect.gen(function*()
        {
            assert.isNull(yield* readResource({ actor: kim, uri: "board://park-board" }, CONFIG));
            assert.isNull(yield* readResource({ actor: kim, uri: "company://../etc" }, CONFIG));
            assert.isNotNull(yield* readResource({ actor: park, uri: "board://park-board" }, CONFIG));
        })));
});

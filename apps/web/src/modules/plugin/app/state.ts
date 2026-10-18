import type { InvestingPage, InvestingView } from "../investing/contract";

/**
 * 화면(iframe)의 상태와 그 전이. 순수 함수라 브라우저 없이 잰다(`state.test.ts`).
 *
 * 화면은 호스트(ChatGPT) 안에서 뜨고, 호스트가 보내는 것에 따라 바뀐다. 도구의 결과와 호스트의 맥락(테마 · 표시 방식 · 어느 도구가
 * 띄웠는가)이다. 그 하나하나가 사건이고, `reduce` 가 사건마다 다음 상태를 정한다. 호스트에 말을 거는 일(`main.tsx`)은 상태를 보고
 * 하며, 여기서는 하지 않는다.
 *
 * ⚠ **호스트를 지나온 것도 밖에서 온 입력이다.** 도구의 결과는 모양을 확인하고 받는다. 틀린 것은 버리고 화면을 그대로 둔다.
 * ⚠ **처음 그릴 것은 호스트가 준다.** 결과가 오기 전에는 띄운 도구의 이름으로 어느 화면인지 짐작해 그 화면의 기다리는 얼굴을 그린다.
 * ⚠ 이 폴더의 파일은 화면의 묶음에 들어간다. 서버의 것을 import 하지 않는다. 타입만 가져오는 것은 묶음에 실리지 않는다.
 */
export interface Abilities
{
    /** 대화에 메시지를 보낼 수 있다(MCP Apps 표준) */
    readonly message: boolean;
    /** 고른 것을 모델의 컨텍스트에 붙일 수 있다 */
    readonly modelContext: boolean;
    /** 호스트에게 밖의 링크를 열어 달라고 청할 수 있다 */
    readonly openLink: boolean;
}

/** 「대화에 추가」로 붙인 것 하나. 붙인 것 모두를 한 번에 모델의 컨텍스트로 보낸다 */
export interface ContextItem
{
    readonly key: string;
    readonly title: string;
    readonly text: string;
}

export interface AppState
{
    /** 도구의 결과가 오기 전에는 `null` 이고 기다리는 얼굴을 그린다 */
    readonly view: InvestingView | null;
    /** 띄운 도구로 짐작한 화면. 결과가 오기 전의 얼굴을 고른다 */
    readonly expected: InvestingPage | null;
    readonly abilities: Abilities;
    readonly theme: "light" | "dark" | null;
    readonly displayMode: "inline" | "fullscreen" | "pip" | null;
    readonly canFullscreen: boolean;
    readonly added: ReadonlyArray<ContextItem>;
    readonly notice: string | null;
}

export type AppEvent =
    | { readonly type: "host-ready"; readonly capabilities: unknown; readonly context: unknown }
    | { readonly type: "host-context-changed"; readonly context: unknown }
    | { readonly type: "tool-result"; readonly result: unknown }
    | { readonly type: "toggle-context"; readonly item: ContextItem }
    | { readonly type: "notice"; readonly text: string | null };

const NO_ABILITIES: Abilities = { message: false, modelContext: false, openLink: false };

export const INITIAL: AppState = {
    view: null,
    expected: null,
    abilities: NO_ABILITIES,
    theme: null,
    displayMode: null,
    canFullscreen: false,
    added: [],
    notice: null,
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const PAGES: ReadonlyArray<InvestingPage> = ["company", "financials", "peers", "valuation", "filings", "screen", "home", "boards"];

/** 화면이 그리는 도구. 결과가 오기 전에 어느 얼굴을 세울지 고른다(`hostContext.toolInfo`) */
const TOOL_PAGES: Readonly<Record<string, InvestingPage>> = {
    show_company: "company",
    show_financials: "financials",
    compare_peers: "peers",
    value_company: "valuation",
    list_filings: "filings",
    screen_stocks: "screen",
    open_home: "home",
    open_boards: "boards",
};

/** 화면이 꼭 배열로 받아야 하는 칸. 하나라도 배열이 아니면 그 결과를 버린다 */
const LISTS: Readonly<Record<InvestingPage, ReadonlyArray<string>>> = {
    company: ["headline", "metrics", "revenue", "operatingIncome"],
    financials: ["series"],
    peers: ["rows"],
    valuation: ["cells", "assumptions"],
    filings: ["items"],
    screen: ["filters", "rows"],
    home: ["boards", "companies"],
    boards: ["boards"],
};

/** 화면마다 꼭 있어야 하는 칸이 있는지만 본다. 숫자 칸의 값은 그리는 쪽이 `null` 을 견딘다 */
export const viewOf = (value: unknown): InvestingView | null =>
{
    if (!isRecord(value) || !PAGES.includes(value["page"] as InvestingPage))
    {
        return null;
    }

    const page = value["page"] as InvestingPage;
    const hasCompany = !["company", "financials", "valuation", "filings"].includes(page) || isRecord(value["company"]);

    return hasCompany && LISTS[page].every((key) => Array.isArray(value[key])) ? value as unknown as InvestingView : null;
};

/** 호스트가 `ui/initialize` 의 답으로 알린 능력에서 이 화면이 쓰는 것만 고른다. 알리지 않은 것은 없는 것이다 */
export const abilitiesOf = (capabilities: unknown): Abilities =>
{
    const host = isRecord(capabilities) ? capabilities : {};

    return {
        message: isRecord(host["message"]),
        modelContext: isRecord(host["updateModelContext"]),
        openLink: isRecord(host["openLinks"]),
    };
};

const pageOfTool = (context: Record<string, unknown>): InvestingPage | null =>
{
    const info = isRecord(context["toolInfo"]) ? context["toolInfo"] : {};
    const tool = isRecord(info["tool"]) ? info["tool"] : {};
    const name = typeof tool["name"] === "string" ? tool["name"] : "";

    return TOOL_PAGES[name] ?? null;
};

const withContext = (state: AppState, value: unknown): AppState =>
{
    const context = isRecord(value) ? value : {};
    const mode = context["displayMode"];

    return {
        ...state,
        theme: context["theme"] === "light" || context["theme"] === "dark" ? context["theme"] : state.theme,
        displayMode: mode === "inline" || mode === "fullscreen" || mode === "pip" ? mode : state.displayMode,
        canFullscreen: Array.isArray(context["availableDisplayModes"]) ? context["availableDisplayModes"].includes("fullscreen") : state.canFullscreen,
        expected: pageOfTool(context) ?? state.expected,
    };
};

const firstText = (result: Record<string, unknown>): string =>
{
    const block = Array.isArray(result["content"]) ? result["content"].find((each) => isRecord(each) && each["type"] === "text") : undefined;

    return isRecord(block) && typeof block["text"] === "string" ? block["text"] : "";
};

export const reduce = (state: AppState, event: AppEvent): AppState =>
{
    switch (event.type)
    {
        case "host-ready":
            return withContext({ ...state, abilities: abilitiesOf(event.capabilities) }, event.context);

        case "host-context-changed":
            return withContext(state, event.context);

        case "tool-result":
        {
            const result = isRecord(event.result) ? event.result : {};

            if (result["isError"] === true)
            {
                return { ...state, notice: firstText(result) || null };
            }

            const view = viewOf(result["structuredContent"]);

            // 화면 안에서 다시 부른 결과(다른 종목 · 다른 기간)가 와도 붙여 둔 것은 그대로 둔다. 사람이 뗄 때까지 남는다
            return view === null ? state : { ...state, view, expected: view.page, notice: null };
        }

        case "toggle-context":
        {
            const has = state.added.some((each) => each.key === event.item.key);

            return { ...state, added: has ? state.added.filter((each) => each.key !== event.item.key) : [...state.added, event.item] };
        }

        case "notice":
            return { ...state, notice: event.text };
    }
};

export const isAdded = (state: AppState, key: string): boolean => state.added.some((each) => each.key === key);

/** 표시 방식이 넓은가. 사이드바와 크게 보기가 넓고, 대화 안 카드는 좁다 */
export const isWide = (state: AppState): boolean => state.displayMode === "fullscreen";

interface ContextBlock
{
    readonly type: "text";
    readonly text: string;
    readonly _meta?: Readonly<Record<string, unknown>>;
}

/**
 * 붙인 것 모두를 모델의 컨텍스트로. `ui/update-model-context` 의 인자다.
 *
 * 부를 때마다 이 화면이 앞서 낸 컨텍스트를 통째로 갈아 끼운다. 그래서 하나를 떼면 남은 것 모두를 다시 보내고, 다 떼면 빈 것을 보낸다.
 * 조각마다 제목(`openai/title`)을 달아 입력창에 뗄 수 있는 첨부로 서게 한다.
 */
export const modelContextFor = (items: ReadonlyArray<ContextItem>): { readonly content: ReadonlyArray<ContextBlock> } =>
    ({ content: items.map((item) => ({ type: "text", text: item.text, _meta: { "openai/title": item.title } })) });

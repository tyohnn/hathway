import type { McpSurfaceShape, McpToolDefinition } from "@/lib/mcp";

import { NOTE_PREFIX } from "./shared";

/**
 * 플러그인이 MCP 에 더하는 것의 선언. 요청과 무관한 조각이라 순수하고, 봉투(`lib/mcp.ts`)가 목록과 capability 로 답한다.
 *
 * ChatGPT 의 플러그인 익스텐션은 따로 서는 패키지가 아니라 MCP 서버 위의 표시다. 도구의 `_meta` 가 「이 도구를
 * 사이드바에 세워라 · 이 파일을 이 화면으로 열어라」를 말하고, capability 가 「설정은 이 도구로 읽고 써라」를 말한다.
 * 화면은 `ui://` 자원으로 내주는 HTML 한 장이고 호스트가 iframe 으로 띄운다(MCP Apps).
 *
 * | 익스텐션 | 이 파일의 자리 |
 * |---|---|
 * | 사이드바 앱 · 바로 가기 | `open_library` 의 `global` 진입점과 `quickAction` |
 * | 대화 옆 패널 | `open_tray` 의 `thread` 진입점 |
 * | 파일 뷰어 · 편집기 | `open_file` 의 `file` 진입점 |
 * | 구조화 설정 | `extensions["openai/settings"]` 와 `read_settings` · `update_settings` |
 * | 표시 방식 | `uiContents` 가 자원에 싣는 `openai/ui` |
 * | 컴포저 멘션 | `search_mentions` 의 `mentions/search` |
 * | 리치 폼 | `pick_note` · `compose_note` · `attach_notes`(폼의 모양은 `forms.ts`) |
 *
 * 딥링크 · 모델 컨텍스트 · 메시지 · 로컬 파일 열기는 화면 쪽의 일이라 `app/` 에 있고, 온보딩은 플러그인 패키지
 * (`plugin/plugin.json`)의 일이다.
 *
 * ⚠ **도구의 이름에 점을 쓰지 않는다.** 스펙의 본보기는 `cad.library` 처럼 쓰지만, 이 서버에는 클로드 코드도 붙고
 *    그쪽은 도구 이름에 영문자 · 숫자 · 밑줄 · 붙임표만 받는다.
 * ⚠ **도구의 인자로 테넌트나 계정을 받지 않는다.** 코어의 도구와 같은 규칙이다.
 * ⚠ **주소(`ui://…`)를 바꾸면 호스트가 새 화면으로 본다.** 호스트가 화면 자원을 붙들어 두므로, 화면을 크게 바꿔
 *    옛 화면이 남으면 안 될 때 주소 끝에 판을 붙여 바꾼다.
 */
export const UI_MIME = "text/html;profile=mcp-app";

export const UI_LIBRARY = "ui://notes/library";
export const UI_TRAY = "ui://notes/tray";
export const UI_FILE = "ui://notes/file";

/** 쪽지 하나를 가리키는 자원의 앞머리. 멘션과 폼의 선택지가 이 주소를 돌려주고, 읽을 때 다시 행 단위 판정을 지난다 */
export { NOTE_PREFIX };

/** 파일 뷰어가 여는 확장자. HTML `accept` 의 확장자 꼴이라 점으로 시작한다 */
export const FILE_EXTENSIONS: ReadonlyArray<string> = [".md", ".txt"];

/**
 * 사이드바와 탭에 서는 아이콘. 호스트의 지침대로 20×20 판에 1.33px 선의 단색이고, `currentColor` 라 테마를 따른다.
 * 플러그인 패키지의 `plugin/assets/icon.svg` 와 같은 그림이다(`package.test.ts` 가 대조한다).
 */
export const ICON_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 20 20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.33\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M5 3.5h7l3.5 3.5v9.5h-10.5z\"/><path d=\"M12 3.5v3.5h3.5\"/><path d=\"M7.5 10.5h5\"/><path d=\"M7.5 13.5h3.5\"/></svg>\n";

const ICON = { src: `data:image/svg+xml,${encodeURIComponent(ICON_SVG.trim())}`, mimeType: "image/svg+xml", sizes: ["any"] } as const;

const EMPTY_INPUT = { type: "object", properties: {}, additionalProperties: false } as const;

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;

const APP_ONLY = { ui: { visibility: ["app"] } } as const;

const TOOLS: ReadonlyArray<McpToolDefinition> = [
    {
        name: "open_library",
        title: "쪽지",
        description: "이 계정이 볼 수 있는 쪽지를 목록 화면으로 연다. noteId 를 주면 그 쪽지를 펼쳐 둔다.", // ux-writing: 모델이 읽는 설명
        inputSchema: { type: "object", properties: { noteId: { type: "string" } }, additionalProperties: false },
        annotations: READ_ONLY,
        icons: [ICON],
        _meta: {
            ui: { resourceUri: UI_LIBRARY },
            "openai/ui": {
                entrypoints: [{
                    type: "global",
                    quickAction: { title: "쪽지 쓰기", icons: [ICON], target: { type: "tool", name: "compose_note", arguments: {} } },
                }],
            },
        },
    },
    {
        name: "open_tray",
        title: "쪽지 서랍",
        description: "대화 옆에 쪽지 서랍을 연다.", // ux-writing: 모델이 읽는 설명
        inputSchema: EMPTY_INPUT,
        annotations: READ_ONLY,
        icons: [ICON],
        _meta: { ui: { resourceUri: UI_TRAY }, "openai/ui": { entrypoints: [{ type: "thread" }] } },
    },
    {
        name: "open_file",
        title: "파일 보기",
        description: "글 파일을 열어 읽고 고치고 쪽지로 가져온다.", // ux-writing: 모델이 읽는 설명
        inputSchema: {
            type: "object",
            properties: {
                file: {
                    type: "object",
                    properties: { name: { type: "string" }, resourceUri: { type: "string" } },
                    required: ["name", "resourceUri"],
                },
            },
            required: ["file"],
        },
        annotations: READ_ONLY,
        icons: [ICON],
        _meta: { ui: { resourceUri: UI_FILE }, "openai/ui": { entrypoints: [{ type: "file", extensions: FILE_EXTENSIONS }] } },
    },
    {
        name: "read_settings",
        title: "설정 보기",
        inputSchema: { type: "object", additionalProperties: false },
        outputSchema: {
            type: "object",
            properties: {
                schema: { type: "object" },
                values: { type: "object" },
                layout: { type: "array", items: { type: "object" } },
            },
            required: ["schema", "values"],
        },
        annotations: READ_ONLY,
    },
    {
        name: "update_settings",
        title: "설정 바꾸기",
        inputSchema: {
            type: "object",
            properties: {
                set: {
                    type: "object",
                    properties: { defaultVisibility: { type: "string" }, showArchived: { type: "boolean" } },
                    minProperties: 1,
                    additionalProperties: false,
                },
            },
            required: ["set"],
            additionalProperties: false,
        },
        outputSchema: { type: "object", properties: { values: { type: "object" } }, required: ["values"] },
    },
    {
        name: "search_mentions",
        title: "쪽지 찾기",
        inputSchema: { type: "object", properties: { query: { type: "string" } } },
        outputSchema: { type: "object", properties: { items: { type: "array", items: { type: "object" } } }, required: ["items"] },
        annotations: READ_ONLY,
        _meta: { "openai/extensions": { "mentions/search": {} }, ...APP_ONLY },
    },
    {
        name: "pick_note",
        title: "쪽지 고르기",
        description: "사용자가 쪽지를 고르겠다고 할 때 고르는 폼을 띄우고, 고른 쪽지를 목록 화면에 펼친다.", // ux-writing: 모델이 읽는 설명
        inputSchema: EMPTY_INPUT,
        annotations: READ_ONLY,
        _meta: { ui: { resourceUri: UI_LIBRARY } },
    },
    {
        name: "compose_note",
        title: "쪽지 쓰기",
        description: "폼을 띄워 새 쪽지를 받는다. 제목과 내용을 이미 알면 create_note 를 쓴다.", // ux-writing: 모델이 읽는 설명
        inputSchema: EMPTY_INPUT,
    },
    {
        name: "attach_notes",
        title: "대화에 쪽지 붙이기",
        description: "사용자가 대화에 참고할 쪽지를 여럿 고르게 하고, 고른 쪽지의 내용을 돌려준다.", // ux-writing: 모델이 읽는 설명
        inputSchema: EMPTY_INPUT,
        annotations: READ_ONLY,
    },
    {
        name: "import_file",
        title: "파일을 쪽지로 가져오기",
        inputSchema: {
            type: "object",
            properties: { name: { type: "string" }, text: { type: "string" } },
            required: ["name", "text"],
            additionalProperties: false,
        },
        _meta: APP_ONLY,
    },
    {
        name: "reveal_file_path",
        title: "기본 뷰어로 열기",
        inputSchema: EMPTY_INPUT,
        annotations: READ_ONLY,
        _meta: APP_ONLY,
    },
];

/**
 * 화면마다 먼저 청하는 표시 방식. 진입점으로 열 때는 호스트가 늘 전체 화면으로 띄우고, 모델이 도구를 불러 뜰 때 이 값을 본다.
 */
const DISPLAY: Readonly<Record<string, "inline" | "fullscreen">> = {
    [UI_LIBRARY]: "fullscreen",
    [UI_TRAY]: "inline",
    [UI_FILE]: "fullscreen",
};

/** `resources/read` 가 돌려주는 화면 자원의 내용. 세 화면이 같은 HTML 을 쓰고 표시 방식만 다르다 */
export const uiContents = (uri: string, html: string): ReadonlyArray<Record<string, unknown>> => [{
    uri,
    mimeType: UI_MIME,
    text: html,
    _meta: {
        "openai/ui": { preferredDisplayMode: DISPLAY[uri] ?? "inline", availableDisplayModes: ["inline", "fullscreen"] },
        // 화면은 밖의 주소를 부르지 않는다. 서버와는 호스트를 지나는 도구 호출로만 말한다
        ui: { csp: { connectDomains: [], resourceDomains: [] } },
    },
}];

export const isUiResource = (uri: string): boolean => Object.hasOwn(DISPLAY, uri);

export const PLUGIN_SHAPE: McpSurfaceShape = {
    tools: TOOLS,
    resources: [
        { uri: UI_LIBRARY, name: "library", title: "쪽지", mimeType: UI_MIME },
        { uri: UI_TRAY, name: "tray", title: "쪽지 서랍", mimeType: UI_MIME },
        { uri: UI_FILE, name: "file", title: "파일 보기", mimeType: UI_MIME },
    ],
    resourcePrefixes: [NOTE_PREFIX],
    extensions: { "openai/settings": { readTool: "read_settings", updateTool: "update_settings" } },
};

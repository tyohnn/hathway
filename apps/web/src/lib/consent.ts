/**
 * 동의 화면에 보이는 권한을 실제 도구와 범위에서 뽑는다.
 *
 * ⚠ **손으로 적은 목록을 두지 않는다.** 도구가 늘었는데 화면의 목록이 그대로면, 사람은 보이지 않은 일까지 허락하게
 *    된다. 그래서 `/api/mcp` 가 내놓는 도구 목록과 Supabase 가 넘긴 범위만 읽는다.
 * ⚠ **읽기만 한다고 밝힌 도구만 읽기다.** `readOnlyHint` 가 없으면 쓰기로 적는다. 덜 위험하게 보이는 쪽으로
 *    어림하지 않는다.
 * ⚠ **옮기지 못한 범위는 원문 그대로 둔다**(2026-09-29 사용자 결정). 덮어 쓰면 무엇을 허락하는지 알 길이 없다.
 */
export type PermissionKind = "write" | "read" | "account";

export interface PermissionItem
{
    readonly label: string;
    /** 우리말로 옮기지 못해 원문을 그대로 보이는 줄 */
    readonly raw: boolean;
}

export interface ConsentPermissions
{
    /** 칸마다 한 줄. 자세히 펼치기 전에 보이는 것이다 */
    readonly summary: ReadonlyArray<{ readonly kind: PermissionKind; readonly label: string }>;
    readonly sections: ReadonlyArray<{ readonly kind: PermissionKind; readonly items: ReadonlyArray<PermissionItem> }>;
    /** 앱을 닫아도 연결이 이어지는가(`offline_access`) */
    readonly staysConnected: boolean;
}

export interface ConsentTool
{
    readonly name: string;
    readonly title?: string;
    readonly annotations?: Readonly<Record<string, unknown>>;
}

const SCOPE_LABELS: Readonly<Record<string, string>> = {
    openid: "내 계정",
    email: "이메일 주소",
    profile: "이름과 프로필 사진",
    phone: "전화번호",
};

const KEEP_CONNECTED = "offline_access";

/** 요약 한 줄에 이름을 몇 개까지 적는가. 넘치면 「외 N개」로 줄인다 */
const SUMMARY_NAMES = 3;

const toolItem = (tool: ConsentTool): PermissionItem =>
    tool.title === undefined || tool.title === ""
        ? { label: tool.name, raw: true }
        : { label: tool.title, raw: false };

/** 두 도구가 같은 이름표를 달면(폼으로 쓰기 · 바로 쓰기) 사람에게는 같은 일이라 한 줄로 모은다 */
const distinct = (items: ReadonlyArray<PermissionItem>): ReadonlyArray<PermissionItem> =>
    items.filter((item, index) => items.findIndex((other) => other.label === item.label) === index);

const isReadOnly = (tool: ConsentTool): boolean => tool.annotations?.["readOnlyHint"] === true;

const summaryOf = (items: ReadonlyArray<PermissionItem>): string =>
{
    const names = items.slice(0, SUMMARY_NAMES).map((item) => item.label).join(", ");
    const rest = items.length - SUMMARY_NAMES;

    return rest > 0 ? `${names} 외 ${rest}개` : names;
};

export const consentPermissions = (
    tools: ReadonlyArray<ConsentTool>,
    scopes: ReadonlyArray<string>,
): ConsentPermissions =>
{
    const sections = [
        { kind: "write" as const, items: distinct(tools.filter((tool) => !isReadOnly(tool)).map(toolItem)) },
        { kind: "read" as const, items: distinct(tools.filter(isReadOnly).map(toolItem)) },
        {
            kind: "account" as const,
            items: scopes
                .filter((scope) => scope !== KEEP_CONNECTED)
                .map((scope): PermissionItem =>
                {
                    const label = SCOPE_LABELS[scope];

                    return label === undefined ? { label: scope, raw: true } : { label, raw: false };
                }),
        },
    ].filter((section) => section.items.length > 0);

    return {
        summary: sections.map((section) => ({ kind: section.kind, label: summaryOf(section.items) })),
        sections,
        staysConnected: scopes.includes(KEEP_CONNECTED),
    };
};

export type ClientBrand = "chatgpt" | "claude";

/** 앱마다 돌아가는 곳. 그 도메인과 그 밑의 주소만 맞는 것으로 친다(`chatgpt.com.evil.example` 은 아니다) */
const BRAND_HOSTS: ReadonlyArray<{ readonly brand: ClientBrand; readonly hosts: ReadonlyArray<string> }> = [
    { brand: "chatgpt", hosts: ["chatgpt.com", "chat.openai.com"] },
    { brand: "claude", hosts: ["claude.ai", "claude.com"] },
];

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"]);

const underHost = (hostname: string, host: string): boolean => hostname === host || hostname.endsWith(`.${host}`);

/**
 * 동의를 묻는 앱이 ChatGPT 인지 Claude 인지 가린다. 모르면 `null` 이고 화면은 이름의 첫 글자를 그린다.
 *
 * ⚠ **이름이 아니라 돌아갈 주소로 가린다.** 동적 등록에서는 누구나 「ChatGPT」라는 이름을 단다. 돌아갈 주소는 Supabase 가
 *    등록된 값과 맞춰 보고, 그곳에 코드가 가므로 남의 도메인을 적어서는 얻는 것이 없다.
 * ⚠ **Claude Code 만 이름을 함께 본다.** 내 컴퓨터(`localhost`)로 돌아가므로 주소로는 어느 앱인지 알 수 없다. 같은 컴퓨터의 다른
 *    프로그램이 이 이름을 달면 Claude 로 보이지만, 그 프로그램은 이미 사람의 컴퓨터 안에 있고 돌아갈 주소도 화면에 그대로 보인다.
 */
export const clientBrandOf = (name: string, redirectUri: string): ClientBrand | null =>
{
    let url: URL;

    try
    {
        url = new URL(redirectUri);
    }
    catch
    {
        return null;
    }

    if (url.protocol === "https:")
    {
        return BRAND_HOSTS.find((entry) => entry.hosts.some((host) => underHost(url.hostname, host)))?.brand ?? null;
    }

    return url.protocol === "http:" && LOOPBACK.has(url.hostname) && name.trim().startsWith("Claude Code")
        ? "claude"
        : null;
};

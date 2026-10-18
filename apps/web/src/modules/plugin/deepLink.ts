/**
 * 딥링크. 사이드바 앱(쪽지 목록)의 어느 화면을 바로 여는 주소다.
 *
 * 주소는 호스트가 정한 꼴이고, 화면 안의 길(`path`)만 우리 것이다. 호스트는 그 길을 화면(iframe)에 `hostContext` 로
 * 넘기고, 화면이 `routeOfDeepLink` 로 읽어 그 쪽지를 펼친다. 서버는 딥링크를 받지 않는다. 진입점 도구는 늘 `{}` 로 불린다.
 *
 * ⚠ **플러그인의 id 는 올린 뒤에야 안다.** ChatGPT 의 플러그인 주소(`chatgpt.com/plugins/<id>`)에 있는 값이다. 로컬
 *    마켓플레이스로 깐 것은 `<플러그인 이름>@<마켓플레이스 이름>` 이다.
 * ⚠ **화면 안의 길은 밖에서 온 입력이다.** 아는 꼴만 받고 나머지는 목록으로 보낸다. 그 쪽지가 보이는지는 길이 정하지
 *    않는다. 화면은 받은 목록에 있는 쪽지만 펼친다.
 * ⚠ 이 파일은 화면의 묶음에도 들어간다. 서버에서만 도는 것(`node:` 모듈)을 부르지 않는다.
 */
export const LIBRARY_TOOL = "open_library";

export interface DeepLinkTarget
{
    readonly pluginId: string;
    /** 로컬이나 저장소의 마켓플레이스 이름. 디렉터리에 올린 플러그인에는 붙이지 않는다 */
    readonly marketplace?: string | null;
    /** 화면 안의 길. `/` 로 시작하고 `#` 뒤는 쓰지 않는다 */
    readonly path: string;
}

export const notePath = (noteId: string): string => `/notes/${noteId}`;

/** 데스크톱은 `codex`, 모바일은 `chatgpt` 다 */
export const appDeepLink = (scheme: "codex" | "chatgpt", target: DeepLinkTarget): string =>
{
    const plugin = `${encodeURIComponent(target.pluginId)}${target.marketplace ? `@${target.marketplace}` : ""}`;

    return `${scheme}://plugins/${plugin}/app/${encodeURIComponent(LIBRARY_TOOL)}?path=${encodeURIComponent(target.path)}`;
};

export const webDeepLink = (target: DeepLinkTarget): string =>
    `https://chatgpt.com/plugins/${encodeURIComponent(target.pluginId)}/app/${encodeURIComponent(LIBRARY_TOOL)}?path=${encodeURIComponent(target.path)}`;

export type DeepLinkRoute = { readonly page: "list" } | { readonly page: "note"; readonly noteId: string };

export const routeOfDeepLink = (url: string | undefined): DeepLinkRoute =>
{
    const match = /^\/notes\/(\d+)(?:\?.*)?$/.exec(url ?? "");

    return match?.[1] === undefined ? { page: "list" } : { page: "note", noteId: match[1] };
};

import { assert, describe, it } from "vitest";

import { appDeepLink, notePath, routeOfDeepLink, webDeepLink } from "./deepLink";

describe("딥링크", () =>
{
    it("딥링크는 플러그인과 도구와 화면 안의 길로 선다. 길은 물음표 뒤까지 통째로 인코딩한다", () =>
    {
        assert.strictEqual(
            appDeepLink("codex", { pluginId: "plugin_asdk_app_1", path: "/notes/12?from=mention" }),
            "codex://plugins/plugin_asdk_app_1/app/open_library?path=%2Fnotes%2F12%3Ffrom%3Dmention",
        );
        assert.strictEqual(
            webDeepLink({ pluginId: "plugin_asdk_app_1", path: notePath("12") }),
            "https://chatgpt.com/plugins/plugin_asdk_app_1/app/open_library?path=%2Fnotes%2F12",
        );
    });

    it("마켓플레이스로 깐 플러그인은 그 이름을 붙이고, 디렉터리에 올린 것은 붙이지 않는다", () =>
    {
        assert.strictEqual(
            appDeepLink("chatgpt", { pluginId: "notes plugin", marketplace: "local-repo", path: "/" }),
            "chatgpt://plugins/notes%20plugin@local-repo/app/open_library?path=%2F",
        );
    });

    it("딥링크의 /notes/<id> 는 그 쪽지를 연다. 모르는 길은 목록으로 간다", () =>
    {
        assert.deepStrictEqual(routeOfDeepLink("/notes/12"), { page: "note", noteId: "12" });
        assert.deepStrictEqual(routeOfDeepLink("/notes/12?from=mention"), { page: "note", noteId: "12" });
        assert.deepStrictEqual(routeOfDeepLink("/"), { page: "list" });
        assert.deepStrictEqual(routeOfDeepLink("/settings"), { page: "list" });
        assert.deepStrictEqual(routeOfDeepLink("/notes/../../etc"), { page: "list" });
        assert.deepStrictEqual(routeOfDeepLink(undefined), { page: "list" });
    });
});

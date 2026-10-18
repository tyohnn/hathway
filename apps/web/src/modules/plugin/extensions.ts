import "server-only";

import { Effect, Layer } from "effect";

import { preferenceStorePostgresLayer } from "@hathway/adapters-postgres/preferences/PreferenceStorePostgres";
import type { NoteStore } from "@hathway/notes/ports/NoteStore";
import type { PreferenceStore } from "@hathway/preferences/ports/PreferenceStore";

import { McpSurface } from "@/extensions/McpSurface";
import { executor } from "@/lib/auth";
import { noteStoreLayer } from "@/lib/notesRuntime";

import { APP_HTML } from "./app/bundle.generated";
import { PLUGIN_SHAPE } from "./surface";
import { callTool, readResource, type PluginConfig } from "./usecases";

/**
 * 플러그인 모듈이 코어의 확장 지점 `McpSurface` 를 채운다. 코어는 이 파일을 모르고 `lib/modules.ts` 가 잇는다.
 *
 * ⚠ **저장소는 요청과 무관한 불변 어댑터다.** 행위자는 호출마다 코어가 넘긴다. 이 층이 행위자를 품지 않는다.
 */
export const pluginSurfaceLayer = (
    stores: Layer.Layer<NoteStore | PreferenceStore>,
    config: PluginConfig,
): Layer.Layer<McpSurface> =>
    Layer.succeed(McpSurface, McpSurface.of({
        shape: PLUGIN_SHAPE,
        call: (call) => callTool(call, config).pipe(Effect.provide(stores)),
        read: (read) => readResource(read, config).pipe(Effect.provide(stores)),
    }));

const env = (name: string): string | null =>
{
    const value = process.env[name];

    return value === undefined || value === "" ? null : value;
};

/**
 * 환경에서 읽는 설정.
 *
 * ⚠ **`PLUGIN_STATE_SECRET` 이 없으면 폼을 내지 않는다.** 서명하지 못한 상태로 폼을 내면 답을 확인할 길이 없다. 폼을 쓰는
 *    도구는 그때 글로 안내하고, 나머지 익스텐션은 그대로 돈다.
 */
export const pluginConfig = (): PluginConfig => ({
    stateSecret: env("PLUGIN_STATE_SECRET"),
    pluginId: env("PLUGIN_DIRECTORY_ID"),
    appHtml: APP_HTML,
});

/** 이 모듈이 채우는 확장 지점. 쪽지와 설정의 저장소는 이 앱의 접속(`web_app`)에 붙는다 */
export const pluginExtensions: Effect.Effect<Layer.Layer<McpSurface>, unknown> =
    Effect.gen(function*()
    {
        const notes = yield* noteStoreLayer;
        const sql = yield* executor();

        return pluginSurfaceLayer(Layer.mergeAll(notes, preferenceStorePostgresLayer(sql)), pluginConfig());
    });

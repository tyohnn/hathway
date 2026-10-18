import "server-only";

import { Effect, Layer } from "effect";

import { McpSurface } from "@/extensions/McpSurface";
import { boardStoreLayer } from "@/lib/boardsRuntime";
import { marketStoreLayer } from "@/lib/marketRuntime";

import { APP_HTML } from "./app/bundle.generated";
import { PLUGIN_SHAPE } from "./surface";
import { callTool, readResource, type PluginConfig, type PluginStores } from "./usecases";

/**
 * 플러그인 모듈이 코어의 확장 지점 `McpSurface` 를 채운다. 코어는 이 파일을 모르고 `lib/modules.ts` 가 잇는다.
 *
 * ⚠ **저장소는 요청과 무관한 불변 어댑터다.** 행위자는 호출마다 코어가 넘긴다. 이 층이 행위자를 품지 않는다.
 */
export const pluginSurfaceLayer = (
    stores: Layer.Layer<PluginStores>,
    config: PluginConfig,
): Layer.Layer<McpSurface> =>
    Layer.succeed(McpSurface, McpSurface.of({
        shape: PLUGIN_SHAPE,
        call: (call) => callTool(call, config).pipe(Effect.provide(stores)),
        read: (read) => readResource(read, config).pipe(Effect.provide(stores)),
    }));

const newId = (prefix: string): string => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

export const pluginConfig = (): PluginConfig => ({ appHtml: APP_HTML, newId });

/** 이 모듈이 채우는 확장 지점. 시장 데이터와 보드는 이 앱의 접속(`web_app`)에 붙는다 */
export const pluginExtensions: Effect.Effect<Layer.Layer<McpSurface>, unknown> =
    Effect.gen(function*()
    {
        const market = yield* marketStoreLayer;
        const boards = yield* boardStoreLayer;

        return pluginSurfaceLayer(Layer.mergeAll(market, boards), pluginConfig());
    });

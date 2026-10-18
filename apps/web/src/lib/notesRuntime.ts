import "server-only";

import { Effect, type Layer } from "effect";

import { noteStorePostgresLayer } from "@hathway/adapters-postgres/notes/NoteStorePostgres";
import type { NoteStore } from "@hathway/notes/ports/NoteStore";

import { executor } from "./auth";

/**
 * 쪽지 저장소를 이 앱의 접속(`web_app`)에 붙인다.
 *
 * ⚠ **요청과 무관한 불변 어댑터라서 행위자를 품지 않는다.** 행위자는 액션마다 관문이 넘기고, 저장소의
 *    읽는 메서드가 그 행위자를 인자로 받는다. 그래서 이 층은 모듈 스코프 런타임에 올려도 되는 모양이다.
 *    지금 런타임에 올리지 않고 요청마다 만드는 것은 접속 문자열이 없을 때 기동이 아니라 그 요청이
 *    실패하게 하려는 것이다. 풀은 `connection.ts` 가 `globalThis` 에 두고 다시 쓴다.
 */
export const noteStoreLayer: Effect.Effect<Layer.Layer<NoteStore>, unknown> =
    Effect.map(executor(), noteStorePostgresLayer);

import "server-only";

import { Effect, type Layer } from "effect";

import { conversationStorePostgresLayer } from "@hathway/adapters-postgres/agent/ConversationStorePostgres";
import { noteStorePostgresLayer } from "@hathway/adapters-postgres/notes/NoteStorePostgres";
import type { ConversationStore } from "@hathway/agents/ports/ConversationStore";
import type { NoteStore } from "@hathway/notes/ports/NoteStore";

import { executor } from "./auth";

/**
 * 이 앱의 저장소 둘을 앱의 접속(`agent_app`)에 붙인다. 라우트와 화면과 워크플로의 스텝이 함께 쓴다.
 *
 * ⚠ **행위자를 품지 않는다.** 읽는 메서드가 행위자를 인자로 받는다. 그래서 요청 사이에 섞일 상태가 없다.
 * ⚠ 요청마다 만드는 것은 접속 문자열이 없을 때 기동이 아니라 그 요청이 실패하게 하려는 것이다.
 *    풀은 `connection.ts` 가 `globalThis` 에 두고 다시 쓴다.
 */
export const conversationStoreLayer: Effect.Effect<Layer.Layer<ConversationStore>, unknown> =
    Effect.map(executor(), conversationStorePostgresLayer);

export const noteStoreLayer: Effect.Effect<Layer.Layer<NoteStore>, unknown> =
    Effect.map(executor(), noteStorePostgresLayer);

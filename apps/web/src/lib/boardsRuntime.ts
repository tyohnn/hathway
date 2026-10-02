import "server-only";

import { Effect, type Layer } from "effect";

import { boardStorePostgresLayer } from "@investment/adapters-postgres/research/BoardStorePostgres";
import type { BoardStore } from "@investment/research/ports/BoardStore";

import { executor } from "./auth";

/** 보드 저장소의 Postgres 구현. 접속 문자열(`WEB_DATABASE_URL`)이 없으면 실패로 답한다 */
export const boardStoreLayer: Effect.Effect<Layer.Layer<BoardStore>, unknown> =
    Effect.map(executor(), boardStorePostgresLayer);

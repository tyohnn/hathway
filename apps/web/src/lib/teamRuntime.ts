import "server-only";

import { Effect, type Layer } from "effect";

import { teamDirectoryPostgresLayer } from "@investment/adapters-postgres/org/TeamDirectoryPostgres";
import type { TeamDirectory } from "@investment/access/ports/TeamDirectory";

import { executor } from "./auth";

/**
 * 팀 명부를 이 앱의 접속(`web_app`)에 붙인다. 행위자를 품지 않는 것은 `boardsRuntime.ts` 와 같은 까닭이다.
 */
export const teamDirectoryLayer: Effect.Effect<Layer.Layer<TeamDirectory>, unknown> =
    Effect.map(executor(), teamDirectoryPostgresLayer);

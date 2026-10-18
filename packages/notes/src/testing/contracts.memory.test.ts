import { noteStoreMemory } from "./noteStoreMemory.ts";
import { noteStoreContract } from "./contracts/note-store.ts";

// 행 단위 판정의 질의가 술어와 같은 집합을 내는지를 도커 없이 먼저 잰다. 같은 계약이 Postgres 에서도 돈다
noteStoreContract("memory", () => noteStoreMemory());

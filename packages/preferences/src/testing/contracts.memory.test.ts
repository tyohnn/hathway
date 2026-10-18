import { preferenceStoreMemory } from "./preferenceStoreMemory.ts";
import { preferenceStoreContract } from "./contracts/preference-store.ts";

// 설정이 사람마다 따로 서는지를 도커 없이 먼저 잰다. 같은 계약이 Postgres 에서도 돈다
preferenceStoreContract("memory", () => preferenceStoreMemory());

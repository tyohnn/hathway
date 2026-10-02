import { boardStoreMemory } from "./boardStoreMemory.ts";
import { boardStoreContract } from "./contracts/board-store.ts";

boardStoreContract("memory", () => boardStoreMemory());

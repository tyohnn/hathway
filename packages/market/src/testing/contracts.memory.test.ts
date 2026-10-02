import { Effect } from "effect";

import { marketStoreContract } from "./contracts/market-store.ts";
import { marketMemory } from "./marketMemory.ts";

marketStoreContract("memory", (seed) => Effect.succeed(marketMemory(seed)));

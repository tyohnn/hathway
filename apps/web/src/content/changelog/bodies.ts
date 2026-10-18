import type { ComponentType } from "react";

import V0_1_0 from "./0.1.0.mdx";
import type { ReleaseVersion } from "./index";

/** 판마다의 본문. 목록(`index.ts`)과 짝이고, 한쪽만 더하면 타입이 막는다(`types.ts` 머리말) */
export const RELEASE_BODIES: Readonly<Record<ReleaseVersion, ComponentType>> = {
    "0.1.0": V0_1_0,
};

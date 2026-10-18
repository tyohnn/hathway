import type { ComponentType } from "react";

import Hello from "./hello.mdx";
import type { PostSlug } from "./index";

/** 글마다의 본문. 목록(`index.ts`)과 짝이고, 한쪽만 더하면 타입이 막는다(`types.ts` 머리말) */
export const POST_BODIES: Readonly<Record<PostSlug, ComponentType>> = {
    hello: Hello,
};

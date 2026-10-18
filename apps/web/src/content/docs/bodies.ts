import type { ComponentType } from "react";

import ChatGpt from "./chatgpt";
import ConnectMcp from "./connect-mcp";
import GettingStarted from "./getting-started.mdx";
import McpTools from "./mcp-tools";
import type { DocSlug } from "./index";

/** 문서의 본문. 목록(`index.ts`)과 짝이고, 한쪽만 더하면 타입이 막는다(`types.ts` 머리말) */
export const DOC_BODIES: Readonly<Record<DocSlug, ComponentType>> = {
    "getting-started": GettingStarted,
    chatgpt: ChatGpt,
    "connect-mcp": ConnectMcp,
    "mcp-tools": McpTools,
};

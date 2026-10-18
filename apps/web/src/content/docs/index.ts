import type { DocPage } from "../types";

/**
 * 문서 목록. 사이드바의 묶음과 차례가 이 목록의 차례다. 문서를 더할 때는 이 폴더에 `<slug>.mdx` 를 두고 여기에 한 줄,
 * `bodies.ts` 에 한 줄을 더한다.
 *
 * 코드의 값이 들어가는 문서는 MDX 가 아니라 TSX 다. 「MCP 도구」는 도구 목록(`mcp-tools.tsx`)에서, 「ChatGPT에서 쓰기」와
 * 「Claude에 연결하기」는 서비스 주소에서 그린다. ⚠ `chatgpt` 의 주소는 `llms.txt` 가 연결하는 법으로 가리킨다(`lib/discovery.ts`).
 */
export const DOCS = [
    { slug: "getting-started", title: "시작하기", description: "종목을 찾아 공시와 재무 숫자를 읽고 적정가를 계산하는 법이에요.", group: "처음 쓸 때" },
    { slug: "chatgpt", title: "ChatGPT에서 쓰기", description: "ChatGPT 대화에서 종목을 분석하고 보드에 담는 법과 도구 목록이에요.", group: "연결" },
    { slug: "connect-mcp", title: "Claude에 연결하기", description: "Claude 대화 안에서 같은 분석을 쓰는 법이에요.", group: "연결" },
    { slug: "mcp-tools", title: "MCP 도구", description: "연결한 앱이 쓰는 도구와 받는 값이에요.", group: "연결" },
] as const satisfies ReadonlyArray<DocPage>;

export type DocSlug = (typeof DOCS)[number]["slug"];

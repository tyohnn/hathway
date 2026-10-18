import type { DocPage } from "../types";

/**
 * 문서 목록. 사이드바의 묶음과 차례가 이 목록의 차례다. 문서를 더할 때는 이 폴더에 `<slug>.mdx` 를 두고 여기에 한 줄,
 * `bodies.ts` 에 한 줄을 더한다.
 *
 * ⚠ 스캐폴드의 예시 문서다. 새 제품에서 바꾼다. 코드의 값이 들어가는 문서는 MDX 가 아니라 TSX 다. 「MCP 도구」는 도구
 *    목록(`mcp-tools.tsx`)에서, 「Claude에 연결하기」는 서비스 주소(`connect-mcp.tsx`)에서 그린다.
 */
export const DOCS = [
    { slug: "getting-started", title: "시작하기", description: "로그인하고 쪽지를 쓰고 보관하는 법이에요.", group: "처음 쓸 때" },
    { slug: "connect-mcp", title: "Claude에 연결하기", description: "Claude 대화 안에서 내 쪽지를 읽고 쓸 수 있어요.", group: "연결" },
    { slug: "mcp-tools", title: "MCP 도구", description: "연결한 앱이 쓰는 도구와 받는 값이에요.", group: "연결" },
] as const satisfies ReadonlyArray<DocPage>;

export type DocSlug = (typeof DOCS)[number]["slug"];

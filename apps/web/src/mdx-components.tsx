import type { MDXComponents } from "mdx/types";

import { Callout, H2, H3, Pre, Step, Steps } from "@/app/(site)/_components/prose";

/**
 * MDX 본문의 요소를 무엇으로 그릴지 정하는 자리. `@next/mdx` 가 App Router 에서 이 파일을 찾는다.
 *
 * 본문은 시스템의 조판 축(`.typeset`)이 그리고, 조판이 모르는 모양만 여기서 잇는다. 제목에는 목차가 가리킬 앵커를,
 * 울타리 코드에는 머리와 복사 단추를 단다. MDX 에서 가져오지 않고 쓸 수 있는 조각은 `Callout` · `Steps` · `Step` 이다.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents
{
    return { ...components, h2: H2, h3: H3, pre: Pre, Callout, Steps, Step };
}

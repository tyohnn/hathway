import Link from "next/link";

import { buttonVariants } from "@hathway/ui/components/button";
import { Plus } from "@hathway/ui/icons";

import { creatables } from "@/lib/paths";

/**
 * 홈 맨 위의 루프 진입점. 만들 수 있는 것마다 단추 하나다(`lib/paths.ts` 의 `creatables`, 사이드바의 만들기 · ⌘K 팔레트와 같은 목록).
 *
 * ⚠ 생성형 제품이면 이 자리가 큰 입력 칸 하나가 된다(「무엇을 만들까요?」). 홈에서 바로 만들 수 있으면 핵심 루프의 클릭 예산이 1 이 된다.
 */
export function LoopEntry()
{
    return (
        <section aria-label="만들기" className="flex flex-wrap gap-2">
            {creatables.map((entry) => (
                <Link key={entry.href} href={entry.href} className={buttonVariants({})}>
                    <Plus data-icon="inline-start" />
                    {entry.action}
                </Link>
            ))}
        </section>
    );
}

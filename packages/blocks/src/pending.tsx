import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

/**
 * 값이 오기 전의 글자 자리. 블록이 `loading` 일 때 제목 · 설명 · 이름 같은 **값 자리만** 이것으로 바꾼다.
 *
 * ⚠ **막대의 높이를 숫자로 정하지 않는다.** 보이지 않는 글자를 채워 두어 그 자리의 글꼴 · 줄 높이를 그대로 따른다.
 *    값이 와서 글자로 바뀌어도 줄 높이가 같아 화면이 움직이지 않는다. 너비만 글자 수(`length`)로 어림한다.
 * ⚠ 읽는 사람에게는 없는 것이다(`aria-hidden`). 기다리는 중이라는 사실은 블록의 바깥 틀이 `aria-busy` 로 말한다.
 */
export function PendingText({ length = 8, className }: { readonly length?: number; readonly className?: string })
{
    return (
        <Skeleton aria-hidden className={cn("inline-block max-w-full align-middle text-transparent select-none", className)}>
            {"가".repeat(length)}
        </Skeleton>
    );
}

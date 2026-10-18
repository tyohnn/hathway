import { cn } from "@hathway/ui/lib/utils";

/**
 * 값이 오기 전의 글자 자리. 블록이 `loading` 일 때 제목 · 설명 · 이름 같은 **값 자리만** 이것으로 바꾼다.
 *
 * ⚠ **막대의 높이를 숫자로 정하지 않는다.** 보이지 않는 글자를 채워 두어 그 자리의 글꼴 · 줄 높이를 그대로 따른다.
 *    값이 와서 글자로 바뀌어도 줄 높이가 같아 화면이 움직이지 않는다. 너비만 글자 수(`length`)로 어림한다.
 * ⚠ 읽는 사람에게는 없는 것이다(`aria-hidden`). 기다리는 중이라는 사실은 블록의 바깥 틀이 `aria-busy` 로 말한다.
 * ⚠ **`<span>` 으로 그린다.** 글자를 대신하는 것이라 글자가 설 수 있는 자리(`<p>` · `<span>` · 제목 · `<code>`)에
 *    그대로 들어가야 한다. 프리미티브 `Skeleton` 은 `<div>` 라서 `ItemDescription`(`<p>`) 안에 넣으면 HTML 이
 *    어긋나 하이드레이션 경고가 뜬다. 그래서 프리미티브를 쓰지 않고 같은 3층 클래스(`cn-skeleton`)만 입힌다.
 */
export function PendingText({ length = 8, className }: { readonly length?: number; readonly className?: string })
{
    return (
        <span
            data-slot="skeleton"
            aria-hidden
            className={cn("cn-skeleton inline-block max-w-full animate-pulse align-middle text-transparent select-none", className)}
        >
            {"가".repeat(length)}
        </span>
    );
}

import { cn } from "@investment/ui/lib/utils";

/**
 * 도구에 넣은 값을 담는 코드 블록.
 *
 * ⚠ **이 폴더 밖으로 내보내지 않는다.** 산문의 `pre` 는 3층 typeset 이 갖고(`typeset.css` 의
 *    「Code blocks」), 그 규칙은 본문의 흐름 여백을 함께 든다. 도구 줄의 속은 흐름이 아니라 한
 *    칸이라 그 여백이 오면 줄 사이가 벌어진다. 생김새만 그대로 가져오고 여백은 여기서 정한다.
 *
 * ⚠ **높이를 막는다.** 에이전트가 쓴 문서가 통째로 인자로 오는 자리가 있어서(`write_document`),
 *    막지 않으면 대화 한 판이 그 본문으로 덮인다.
 */
export function CodeBlock({ children, className }: {
    readonly children: string;
    readonly className?: string;
})
{
    return (
        <pre
            data-slot="tool-call-code"
            className={cn(
                "max-h-40 overflow-auto rounded-[var(--surface-radius-sm)] bg-muted px-3 py-2",
                "font-mono text-[0.875em]/[1.5] text-foreground/80",
                className,
            )}
        >
            <code>{children}</code>
        </pre>
    );
}

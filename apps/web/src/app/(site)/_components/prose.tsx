import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@hathway/ui/components/alert";
import { Badge } from "@hathway/ui/components/badge";
import { Info, Lock, Sparkles, Terminal, TriangleAlert } from "@hathway/ui/icons";

import { headingId } from "@/content/collections";

import { CopyButton } from "./CopyButton";

/**
 * 공개 화면의 글(문서 · 새 소식 · 블로그)이 조판 흐름 안에 세우는 조각. MDX 는 `mdx-components.tsx` 가 이것들로 잇고,
 * TSX 로 쓴 문서는 직접 가져다 쓴다. 모양은 tyohnn 의 docs · changelog 템플릿을 옮긴 것이고 값은 `site.css` 에 있다.
 *
 * ⚠ 조판(`.typeset`)이 모르는 모양은 `not-typeset` 을 단다. 달지 않으면 조판의 여백과 글자 크기가 그 안까지 번진다.
 */

/** 제목의 글을 뽑는다. 앵커(`headingId`)를 지으려는 것이라 요소 안의 글까지 따라 들어간다 */
export const textOf = (node: ReactNode): string =>
{
    if (typeof node === "string" || typeof node === "number")
    {
        return String(node);
    }

    if (isValidElement<{ children?: ReactNode }>(node))
    {
        return textOf(node.props.children);
    }

    return Children.toArray(node).map(textOf).join("");
};

/** 목차에 서는 제목. 앵커는 글에서 짓는다. 목차(`Toc.tsx`)는 `id` 가 있는 h2 · h3 만 줍는다 */
export function H2({ id, children, ...props }: ComponentProps<"h2">)
{
    return <h2 id={id ?? headingId(textOf(children))} {...props}>{children}</h2>;
}

export function H3({ id, children, ...props }: ComponentProps<"h3">)
{
    return <h3 id={id ?? headingId(textOf(children))} {...props}>{children}</h3>;
}

/** 새 소식의 피드는 판의 제목이 h2 라서 본문의 제목을 한 칸씩 내린다(`ReleaseEntry`) */
export function H4({ id, children, ...props }: ComponentProps<"h4">)
{
    return <h4 id={id ?? headingId(textOf(children))} {...props}>{children}</h4>;
}

const LANGUAGE_TITLES: Readonly<Record<string, string>> = {
    bash: "명령",
    sh: "명령",
    shell: "명령",
    json: "JSON",
    ts: "TypeScript",
    tsx: "TypeScript",
};

/** 머리(제목 · 복사 단추)가 달린 코드 블록 */
export function CodeBlock({ title = "명령", code }: { readonly title?: string; readonly code: string })
{
    return (
        <div className="site-code not-typeset">
            <div className="site-code-bar flex items-center justify-between gap-2 py-1 pr-1 pl-3">
                <span className="site-code-title flex min-w-0 items-center gap-1.5">
                    <Terminal />
                    <span className="truncate">{title}</span>
                </span>
                <CopyButton value={code} name={`${title} 복사하기`} />
            </div>
            <pre className="px-4 py-3"><code>{code}</code></pre>
        </div>
    );
}

/** MDX 의 울타리 코드(```bash)를 코드 블록으로 잇는다. 언어가 제목이 된다 */
export function Pre({ children }: ComponentProps<"pre">)
{
    const code = Children.only(children);

    if (!isValidElement<{ className?: string; children?: ReactNode }>(code))
    {
        return <pre>{children}</pre>;
    }

    const language = /language-(\w+)/.exec(code.props.className ?? "")?.[1] ?? "";

    return <CodeBlock title={LANGUAGE_TITLES[language] ?? "코드"} code={textOf(code.props.children).replace(/\n$/, "")} />;
}

const CALLOUT_ICONS = { info: Info, warning: TriangleAlert, lock: Lock, new: Sparkles } as const;

/** 본문 사이의 안내 상자. 제목 한 줄로 말이 되면 설명은 두지 않는다 */
export function Callout({ tone = "info", title, children }: {
    readonly tone?: keyof typeof CALLOUT_ICONS;
    readonly title: string;
    readonly children?: ReactNode;
})
{
    const Icon = CALLOUT_ICONS[tone];

    return (
        <Alert className="not-typeset site-block">
            <Icon />
            <AlertTitle>{title}</AlertTitle>
            {children === undefined ? null : <AlertDescription>{children}</AlertDescription>}
        </Alert>
    );
}

/** 번호가 붙은 절차. 번호는 CSS 카운터가 매긴다(`site.css`). 서버 컴포넌트라 자기 차례를 모르기 때문이다 */
export function Steps({ children }: { readonly children: ReactNode })
{
    return <ol className="site-steps not-typeset flex flex-col gap-5">{children}</ol>;
}

/**
 * 절차의 한 걸음. 제목은 목차에 서지 않도록 앵커를 두지 않는다.
 * ⚠ MDX 에서 본문을 여러 줄로 적으면 `<p>` 로 싸인다. `site.css` 가 그 여백을 지운다.
 */
export function Step({ title, children }: { readonly title: string; readonly children?: ReactNode })
{
    return (
        <li className="flex gap-3">
            <span aria-hidden className="site-step-number flex size-7 shrink-0 items-center justify-center" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
                <h3 className="site-step-title">{title}</h3>
                {children === undefined ? null : <div className="site-step-body">{children}</div>}
            </div>
        </li>
    );
}

/** 표 칸 안의 「필수」 · 「선택」. API 문서의 인자 표가 쓴다 */
export function RequiredBadge({ required }: { readonly required: boolean })
{
    return required ? <Badge>필수</Badge> : <Badge variant="outline">선택</Badge>;
}

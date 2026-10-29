"use client";

import { useEffect, useState } from "react";

/**
 * 본문의 목차. 문서는 오른쪽 기둥(`TocRail`, docs 템플릿)으로 세운다.
 *
 * 목차는 **그려진 본문에서 줍는다**(`[data-toc-root]` 안의 `id` 가 있는 h2 · h3). 목록 파일에 따로 적으면 본문의 제목을
 * 고치는 날 목차만 옛 글로 남는다. 앵커는 `prose.tsx` 의 `H2` · `H3` 가 짓는다.
 *
 * ⚠ 줍는 일이 브라우저에서 일어나므로 첫 그림에는 목차가 비어 있다. 넓은 화면에서만 서는 곁가지라 그렇게 둔다.
 * ⚠ 지금 읽는 제목은 스크롤하는 상자(`[data-toc-scroll]`)의 위쪽 선을 지난 마지막 제목이다.
 */
interface Heading
{
    readonly id: string;
    readonly label: string;
    readonly level: 2 | 3;
}

/** 위쪽 선에서 이만큼 아래까지 들어온 제목을 지금 읽는 것으로 친다 */
const READING_LINE = 96;

function useHeadings(): { readonly headings: ReadonlyArray<Heading>; readonly active: string | null }
{
    const [headings, setHeadings] = useState<ReadonlyArray<Heading>>([]);
    const [active, setActive] = useState<string | null>(null);

    useEffect(() =>
    {
        const root = document.querySelector("[data-toc-root]");
        const scroller = document.querySelector("[data-toc-scroll]");

        if (root === null)
        {
            return;
        }

        const elements = Array.from(root.querySelectorAll<HTMLElement>("h2[id], h3[id]"));

        setHeadings(elements.map((element) => ({
            id: element.id,
            label: element.textContent ?? "",
            level: element.tagName === "H3" ? 3 : 2,
        })));

        const update = (): void =>
        {
            const top = (scroller?.getBoundingClientRect().top ?? 0) + READING_LINE;
            const passed = elements.filter((element) => element.getBoundingClientRect().top <= top);

            setActive((passed.at(-1) ?? elements[0])?.id ?? null);
        };

        update();

        const target: HTMLElement | Window = scroller instanceof HTMLElement ? scroller : window;

        target.addEventListener("scroll", update, { passive: true });

        return () => target.removeEventListener("scroll", update);
    }, []);

    return { headings, active };
}

/** 문서의 오른쪽 기둥과 블로그 글의 왼쪽 기둥. 넓은 화면(xl)에서만 선다. 블로그는 기둥이 통째로 붙으므로 `blog.css` 가 이 목차의 붙음을 푼다 */
export function TocRail()
{
    const { headings, active } = useHeadings();

    return (
        <nav aria-label="목차" className="site-rail hidden w-56 shrink-0 flex-col gap-3 xl:flex">
            {headings.length === 0 ? null : <span className="site-rail-title">목차</span>}
            <ul className="flex flex-col gap-2">
                {headings.map((heading) => (
                    <li key={heading.id} className={heading.level === 3 ? "pl-3" : undefined}>
                        <a href={`#${heading.id}`} data-active={heading.id === active || undefined}>{heading.label}</a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

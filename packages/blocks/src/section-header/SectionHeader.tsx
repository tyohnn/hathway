"use client";

import { cn } from "@investment/ui/lib/utils";

import type { SectionHeaderLevel, SectionHeaderProps } from "./types";

const HEADING_TAG: Record<SectionHeaderLevel, "h2" | "h3" | "h4"> = {
    2: "h2",
    3: "h3",
    4: "h4",
};

/**
 * 층마다 다른 글자 크기.
 *
 * 2층 heading 축의 sm 이 「구역 제목」으로 정해져 있어 기본값 3 이 그것을 읽는다.
 * 4는 heading 축 아래로 내려가야 해서 본문 큰 글씨(ui/text-lg)를 쓴다.
 */
const HEADING_TYPE: Record<SectionHeaderLevel, string> = {
    2: "text-[length:var(--heading-font-size-md)] leading-[var(--heading-line-height-md)] tracking-[var(--heading-letter-spacing)]",
    3: "text-[length:var(--heading-font-size-sm)] leading-[var(--heading-line-height-sm)] tracking-[var(--heading-letter-spacing)]",
    4: "text-[length:var(--ui-text-lg)] leading-[var(--ui-line-height-lg)]",
};

/**
 * 패널 안 구획의 머리.
 *
 * PageHeader 는 라우트의 머리라 제목이 h1 크기인데, 패널 안에서 그 크기를 쓰면 구획이
 * 라우트만큼 무거워진다. 같은 짜임을 화면마다 손으로 다시 만들던 것을 여기로 모았다.
 *
 * 문구를 갖지 않으므로 labels 가 없다. 수도 형식 없이 그대로 적는데, 단위가 붙는 자리라면
 * 그 단위가 도메인의 말이라 호출부가 note 로 적는 것이 옳다.
 */
export function SectionHeader({
    title,
    description,
    count,
    level = 3,
    note,
    actions,
    className,
}: SectionHeaderProps)
{
    const Heading = HEADING_TAG[level];

    return (
        <div
            data-slot="section-header"
            data-level={level}
            className={cn("flex flex-col gap-[var(--surface-gap)]", className)}
        >
            <div className="flex flex-wrap items-center gap-[var(--control-gap-sm)]">
                <Heading
                    className={cn("min-w-0 text-foreground", HEADING_TYPE[level])}
                    style={{ fontWeight: "var(--ui-font-weight)" }}
                >
                    {title}
                </Heading>
                {count === undefined
                    ? null
                    : (
                        <span className="shrink-0 text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)] tabular-nums text-muted-foreground">
                            {count}
                        </span>
                    )}
                {note === undefined
                    ? null
                    : (
                        <div className="ml-auto min-w-0 text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] text-muted-foreground">
                            {note}
                        </div>
                    )}
                {actions === undefined
                    ? null
                    : (
                        <div
                            className={cn(
                                "flex shrink-0 items-center gap-[var(--control-gap-sm)]",
                                // 보조 한 줄이 이미 오른쪽 끝을 잡고 있으면 버튼은 그 뒤에 붙는다.
                                note === undefined ? "ml-auto" : "",
                            )}
                        >
                            {actions}
                        </div>
                    )}
            </div>
            {description === undefined
                ? null
                : (
                    <p className="text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)] text-muted-foreground">
                        {description}
                    </p>
                )}
        </div>
    );
}

"use client";

import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@investment/ui/components/empty";
import { cn } from "@investment/ui/lib/utils";

import type { EmptyStateProps } from "./types";

/**
 * 아무것도 없는 자리 한 벌.
 *
 * 면은 `Empty` 프리미티브 그대로이고 블록이 하는 일은 그 다섯 조각을 늘 같은 차례로 세우는 것뿐이다.
 * 화면마다 손으로 엮으면 어떤 화면은 아이콘이 있고 어떤 화면은 제목만 있어서, 비어 있다는 사실이
 * 화면마다 다른 무게로 읽힌다.
 *
 * ⚠ **`Empty` 는 제 칸을 채우며 가운데로 모인다**(`flex-1` · `items-center`). 좁은 칸에 그대로 두면
 *    옆으로 늘어나므로, 레일이나 패널 안에 세울 때는 감싸는 쪽이 너비를 정한다.
 */
export function EmptyState({ title, description, media, action, className }: EmptyStateProps)
{
    return (
        <Empty data-slot="empty-state" className={cn(className)}>
            <EmptyHeader>
                {media === undefined ? null : <EmptyMedia variant="icon">{media}</EmptyMedia>}
                <EmptyTitle>{title}</EmptyTitle>
                {description === undefined ? null : <EmptyDescription>{description}</EmptyDescription>}
            </EmptyHeader>
            {action === undefined ? null : <EmptyContent>{action}</EmptyContent>}
        </Empty>
    );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createResearchBoardAction } from "@/lib/research/actions";
import type { ResearchBoard, ResearchBoardTheme } from "@/lib/research/types";
import { researchBoardHref } from "@/lib/nav";
import { EmptyState } from "@investment/blocks/empty-state";
import { ItemList } from "@investment/blocks/item-list";
import { PageHeader } from "@investment/blocks/page-header";
import { Button } from "@investment/ui/components/button";

export function ResearchBoardList({
    theme,
    boards,
    writable,
}: {
    theme: ResearchBoardTheme;
    boards: ResearchBoard[];
    /** 쓰기 관문(`boardWritesAllowed`)의 판정. 닫혀 있으면 만드는 단추를 세우지 않는다. */
    writable: boolean;
})
{
    const router = useRouter();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onCreate()
    {
        setPending(true);
        setError(null);
        const result = await createResearchBoardAction(theme);
        setPending(false);
        if (!result.ok)
        {
            setError(result.error);
            return;
        }
        router.push(researchBoardHref(result.board.slug, theme));
    }

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <PageHeader
                title="리서치 보드"
                description="주제마다 그룹을 만들고 차트와 뉴스를 모아요."
                actions={writable
                    ? (
                        <Button type="button" size="sm" disabled={pending} onClick={() => void onCreate()}>
                            {pending ? "만드는 중" : "새 보드"}
                        </Button>
                    )
                    : undefined}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}

            <ItemList
                appearance="card"
                items={boards.map((board) => ({
                    id: board.slug,
                    title: board.title,
                    description: board.tagline || undefined,
                    meta: `그룹 ${board.groups.length}개`,
                }))}
                onItemPress={(item) => router.push(researchBoardHref(item.id, theme))}
                empty={(
                    <EmptyState
                        title="아직 보드가 없어요"
                        description={writable ? "새 보드를 만들어 시작해 보세요." : undefined}
                    />
                )}
            />
        </div>
    );
}

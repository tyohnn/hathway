"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBoardAction } from "@/actions/research";
import type { ResearchBoard, ResearchBoardTheme } from "@/lib/research/types";
import { researchBoardHref, researchBoardsHref } from "@/lib/nav";
import { paths } from "@/lib/paths";
import { EmptyState } from "@investment/blocks/empty-state";
import { ItemList } from "@investment/blocks/item-list";
import { PageHeader } from "@investment/blocks/page-header";
import { Button } from "@investment/ui/components/button";

export function ResearchBoardList({
    theme,
    boards,
    signedIn,
}: {
    theme: ResearchBoardTheme;
    boards: ResearchBoard[];
    /** 로그인했는가. 아니면 「새 보드」 자리에 「로그인」이 선다. 만드는 일은 서버의 관문이 다시 판정한다 */
    signedIn: boolean;
})
{
    const router = useRouter();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onCreate()
    {
        setPending(true);
        setError(null);
        const result = await createBoardAction({ theme });
        setPending(false);
        if (!result.ok)
        {
            if (result.reason === "sign-in")
            {
                router.push(paths.login(researchBoardsHref(theme)));
                return;
            }
            setError(result.message);
            return;
        }
        router.push(researchBoardHref(result.board.slug, theme));
    }

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
            <PageHeader
                title="리서치 보드"
                description="주제마다 그룹을 만들고 차트와 뉴스를 모아요."
                actions={signedIn
                    ? (
                        <Button type="button" size="sm" disabled={pending} onClick={() => void onCreate()}>
                            {pending ? "만드는 중" : "새 보드"}
                        </Button>
                    )
                    : (
                        <Button
                            variant="outline"
                            size="sm"
                            nativeButton={false}
                            render={<Link href={paths.login(researchBoardsHref(theme))} />}
                        >
                            로그인
                        </Button>
                    )}
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
                        description={signedIn ? "새 보드를 만들어 시작해 보세요." : "로그인하면 보드를 만들 수 있어요."}
                    />
                )}
            />
        </div>
    );
}

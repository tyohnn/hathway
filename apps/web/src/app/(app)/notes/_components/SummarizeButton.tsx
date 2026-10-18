"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { Button } from "@hathway/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@hathway/ui/components/card";

import { summarizeNoteAction } from "@/actions/summary";

/**
 * 쪽지 요약 단추. 누르면 크레딧을 잡고 모델을 부른다(`usecases/summary.ts`). 요약은 이 화면에만 서고 적지 않는다.
 *
 * ⚠ **크레딧이 모자라면 요금제 화면으로 가는 길을 준다.** 까닭만 말하고 할 일이 없으면 막다른 길이다.
 * ⚠ **누르기 전에 쓸 수 있는 양을 보인다.** 양은 확장 지점(`CreditMeter.quote`)이 답하고, 재지 않으면(`null`) 서지 않는다.
 */
export function SummarizeButton({ noteId, maxCredits }: { readonly noteId: string; readonly maxCredits: number | null })
{
    const [pending, start] = useTransition();
    const [result, setResult] = useState<Awaited<ReturnType<typeof summarizeNoteAction>> | null>(null);

    const summarize = (): void =>
    {
        start(async () =>
        {
            setResult(await summarizeNoteAction({ noteId }));
        });
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
                <Button variant="outline" disabled={pending} onClick={summarize}>{pending ? "요약하는 중" : "요약하기"}</Button>
                {maxCredits === null ? null : <span className="text-muted-foreground text-sm">최대 {maxCredits} 크레딧</span>}
            </div>
            {result === null ? null : result.ok ? (
                <Card size="sm">
                    <CardHeader>
                        <CardTitle>요약</CardTitle>
                        {/* 결제하지 않는 운영팀에게 「0 크레딧」은 소음이다 */}
                        {result.credits === 0 ? null : <CardDescription>{result.credits} 크레딧을 썼어요.</CardDescription>}
                    </CardHeader>
                    <CardContent className="text-sm leading-6">{result.summary}</CardContent>
                </Card>
            ) : (
                <p role="alert" className="text-destructive text-sm">
                    {result.message}
                    {"upgradeHref" in result && result.upgradeHref !== undefined ? (
                        <>
                            {" "}
                            <Link href={result.upgradeHref} className="text-foreground underline underline-offset-4">요금제 보기</Link>
                        </>
                    ) : null}
                </p>
            )}
        </div>
    );
}

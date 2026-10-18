"use client";

import { useEffect, useState } from "react";

import { Button } from "@hathway/ui/components/button";
import { Check, Share } from "@hathway/ui/icons";

/**
 * 블로그 글을 남에게 건네는 단추. 휴대폰처럼 기기의 공유 창이 있으면 그것을 열고, 없으면 글의 주소를 클립보드에 옮긴다.
 *
 * 주소는 누른 순간의 `location.href` 에서 읽는다. 렌더 중에 읽으면 미리 굽는 틀에 요청마다 다른 값이 들어간다.
 * 공유 창을 닫은 것(`AbortError`)은 실패가 아니라 그냥 지나간다. 복사한 뒤에는 잠깐 「링크를 복사했어요」로,
 * 복사가 막히면 「링크를 복사하지 못했어요」로 바뀐다.
 */
export function ShareButton({ title }: { readonly title: string })
{
    const [result, setResult] = useState<"copied" | "failed" | null>(null);

    useEffect(() =>
    {
        if (result === null)
        {
            return;
        }

        const timer = setTimeout(() => setResult(null), 2000);

        return () => clearTimeout(timer);
    }, [result]);

    const share = async (): Promise<void> =>
    {
        const url = window.location.href;

        if (typeof navigator.share === "function")
        {
            try
            {
                await navigator.share({ title, url });
                return;
            }
            catch (error)
            {
                if (error instanceof DOMException && error.name === "AbortError")
                {
                    return;
                }
            }
        }

        // 클립보드는 권한이 막히거나 http 주소면 거절한다. 그때는 단추가 그 사실을 알린다
        try
        {
            await navigator.clipboard.writeText(url);
            setResult("copied");
        }
        catch
        {
            setResult("failed");
        }
    };

    return (
        <Button type="button" variant="outline" size="sm" onClick={() => void share()}>
            {result === "copied" ? <Check data-icon="inline-start" /> : <Share data-icon="inline-start" />}
            <span aria-live="polite">{result === "copied" ? "링크를 복사했어요" : result === "failed" ? "링크를 복사하지 못했어요" : "공유하기"}</span>
        </Button>
    );
}

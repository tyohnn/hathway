"use client";

import { useEffect, useState } from "react";

import { Button } from "@hathway/ui/components/button";
import { Check, Copy } from "@hathway/ui/icons";

/**
 * 값을 클립보드에 옮기는 단추. 코드 블록의 머리와 새 소식의 「링크 복사하기」가 쓴다.
 *
 * 누른 뒤 잠깐 「복사했어요」로 바뀌었다가 돌아온다. 바뀐 글은 `aria-live` 로 스크린리더에도 들린다.
 */
export function CopyButton({ value, label = "복사하기", name, variant = "ghost", size = "xs" }: {
    readonly value: string;
    readonly label?: string;
    /** 스크린리더가 읽는 이름. 한 화면에 단추가 여럿이면 무엇을 복사하는지 적는다(예: 「명령 복사하기」) */
    readonly name?: string;
    readonly variant?: "ghost" | "outline";
    readonly size?: "xs" | "sm";
})
{
    const [copied, setCopied] = useState(false);

    useEffect(() =>
    {
        if (!copied)
        {
            return;
        }

        const timer = setTimeout(() => setCopied(false), 2000);

        return () => clearTimeout(timer);
    }, [copied]);

    const copy = (): void =>
    {
        void navigator.clipboard.writeText(value).then(() => setCopied(true));
    };

    return (
        <Button type="button" variant={variant} size={size} onClick={copy} aria-label={copied ? undefined : name}>
            {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
            <span aria-live="polite">{copied ? "복사했어요" : label}</span>
        </Button>
    );
}

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Button } from "@hathway/ui/components/button";

import { choose, pageview, readConsent, start } from "./client";
import { posthogSettings } from "./config";

/**
 * 모든 화면의 끝에 서는 자리(`MODULE_ROOTS`). posthog-js 를 열고, 아직 고르지 않은 사람에게 동의를 묻는다.
 *
 * ⚠ **고르기 전에는 아무것도 보내지 않는다**(INV-ANALYTICS-01). 배너는 오른쪽 아래의 작은 판이고, 고르지 않고
 *    지나가도 쓰는 데 막힘이 없다. 왼쪽 아래는 사이드바의 계정 자리(로그아웃)라 피한다.
 * ⚠ **첫 그림에는 배너가 없다.** 쿠키는 브라우저에서만 읽으므로 서버가 그린 판과 어긋나지 않게 마운트 뒤에 세운다.
 */
export function AnalyticsRoot()
{
    const pathname = usePathname();
    const [asking, setAsking] = useState(false);

    useEffect(() =>
    {
        if (posthogSettings().mode === "off")
        {
            return;
        }

        void start();
        setAsking(readConsent() === "unknown");
    }, []);

    useEffect(() =>
    {
        pageview(pathname);
    }, [pathname]);

    if (!asking)
    {
        return null;
    }

    const answer = (consent: "granted" | "denied") =>
    {
        setAsking(false);
        void choose(consent);
    };

    return (
        <section
            aria-label="이용 기록 동의"
            className="bg-popover text-popover-foreground fixed right-4 bottom-4 z-50 flex max-w-sm flex-col gap-3 rounded-lg border p-4 text-sm shadow-lg"
        >
            <p>더 나은 서비스를 위해 쿠키를 사용해요. 거절해도 서비스는 그대로 쓸 수 있어요.</p>
            <div className="flex justify-end gap-2">
                <Button onClick={() => answer("denied")} size="sm" variant="outline">거절하기</Button>
                <Button onClick={() => answer("granted")} size="sm">동의하기</Button>
            </div>
        </section>
    );
}

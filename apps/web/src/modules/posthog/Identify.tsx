"use client";

import { useEffect } from "react";

import type { SignedIn } from "@/lib/moduleClient";

import { identify } from "./client";

/**
 * 로그인한 셸의 자리(`MODULE_SIGNED_IN`). 동의한 사람의 브라우저 이벤트를 계정 id 와 조직에 잇는다.
 * 동의하지 않았으면 아무것도 하지 않는다(`client.ts` 의 `identify`).
 */
export function Identify({ accountId, tenantId }: SignedIn)
{
    useEffect(() =>
    {
        void identify(accountId, tenantId);
    }, [accountId, tenantId]);

    return null;
}

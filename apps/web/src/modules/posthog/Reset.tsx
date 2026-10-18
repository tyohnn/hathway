"use client";

import { useEffect } from "react";

import { reset } from "./client";

/**
 * 로그인 화면의 자리(`MODULE_SIGNED_OUT`). 로그아웃하면 여기로 오므로, 앞 사람과 다음 사람이 한 사람으로 이어지지 않게 끊는다.
 */
export function Reset()
{
    useEffect(() =>
    {
        void reset();
    }, []);

    return null;
}

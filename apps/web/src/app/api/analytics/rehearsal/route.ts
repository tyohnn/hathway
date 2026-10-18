import { connection } from "next/server";

import { rehearsalEvents } from "@hathway/adapters-posthog/RehearsalSink";

import { posthogSettings } from "@/modules/posthog/config";

/**
 * 연습 창구가 이 서버에 모은 이벤트. e2e 가 서버에서 보낸 이벤트를 단언하려고 읽는다.
 *
 * ⚠ **연습일 때만 선다.** 실물이나 끔이면 404 다. 배포는 `NEXT_PUBLIC_POSTHOG_SINK` 를 넣지 않는다.
 * ⚠ 요청마다 읽는다(`connection`). 빌드 때 한 번 그려 두면 빈 목록이 굳는다.
 */
export async function GET(): Promise<Response>
{
    await connection();

    if (posthogSettings().mode !== "rehearsal")
    {
        return new Response(null, { status: 404 });
    }

    return Response.json({ events: rehearsalEvents() });
}

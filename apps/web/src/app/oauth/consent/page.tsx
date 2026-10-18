import { Suspense } from "react";
import type { Metadata } from "next";

import { ConsentPanel, ConsentView } from "./_components/ConsentPanel";

export const metadata: Metadata = { title: "앱 연결" };

/**
 * OAuth 동의 화면.
 *
 * Supabase 가 인가 요청을 받으면 이 주소로 사람을 보내면서 `authorization_id` 를 붙인다. 사람이 여기서
 * 정하고, 그 결정이 Supabase 를 지나 원래 앱으로 돌아간다.
 *
 * ⚠ **셸이 없는 화면이다.** 가운데 카드 한 장이 틀이다(`ConsentFrame`). 여기 온 사람은 우리 앱을 쓰러 온 것이
 *    아니라 문 앞에서 한 번 정하러 온 것이라, 내비게이션을 보이면 갈 곳이 여럿인 것처럼 읽힌다.
 * ⚠ `searchParams` 는 요청 시점 데이터라 `<Suspense>` 안쪽에서 읽는다(로그인 화면과 같은 이유).
 */
export default function ConsentPage(
    { searchParams }: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> },
)
{
    return (
        <Suspense fallback={<ConsentView request={null} />}>
            <ConsentPanel searchParams={searchParams} />
        </Suspense>
    );
}

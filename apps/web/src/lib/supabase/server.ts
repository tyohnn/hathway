import "server-only";

import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

/**
 * 서버에서 쓰는 Supabase 클라이언트를 만드는 **단 한 곳**.
 *
 * 서버 컴포넌트·서버 액션·라우트 핸들러가 모두 이 함수를 지난다. 두 곳에서 만들면 쿠키를 읽고 쓰는 규약이
 * 갈라지고, 그 갈림은 「로그인은 됐는데 새로고침하면 풀린다」처럼 나중에야 드러난다.
 *
 * ⚠ **`getUser()` 를 쓴다. `getSession()` 이 아니다.** 후자는 쿠키에 든 것을 그대로 돌려주므로 위조된 쿠키를
 *    믿는다. 서버에서는 Auth 서버에 물어 토큰을 검증하는 전자만 쓴다.
 * ⚠ **미들웨어는 이 함수를 쓰지 않는다.** 거기에는 `cookies()` 가 없고 요청·응답 객체의 쿠키를 직접 다룬다
 *    (`src/middleware.ts`). 토큰 갱신을 그쪽이 맡는 이유도 같다.
 */
export class MissingSupabaseEnv extends Error
{
    constructor(name: string)
    {
        super(`${name} 이 설정되지 않았다. apps/web/.env.example 을 볼 것`);
        this.name = "MissingSupabaseEnv";
    }
}

export interface SupabaseConfig
{
    readonly url: string;
    readonly anonKey: string;
}

export const supabaseConfig = (): SupabaseConfig =>
{
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (url === undefined || url === "")
    {
        throw new MissingSupabaseEnv("NEXT_PUBLIC_SUPABASE_URL");
    }

    if (anonKey === undefined || anonKey === "")
    {
        throw new MissingSupabaseEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }

    return { url, anonKey };
};

export const supabaseServer = async (): Promise<SupabaseClient> =>
{
    const { url, anonKey } = supabaseConfig();
    const store = await cookies();

    return createServerClient(url, anonKey, {
        cookies: {
            getAll: () => store.getAll(),
            // ⚠ 서버 컴포넌트에서는 쿠키를 쓸 수 없다. 갱신된 토큰을 못 적는 것은 미들웨어가 대신 하므로
            //    여기서는 조용히 넘긴다: 던지면 렌더가 통째로 깨진다
            setAll: (items) =>
            {
                try
                {
                    for (const item of items)
                    {
                        store.set(item.name, item.value, item.options);
                    }
                }
                catch
                {
                    // 읽기 전용 컨텍스트다. 갱신은 미들웨어의 몫이다
                }
            },
        },
    });
};

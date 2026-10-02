import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { AuthSettings } from "@investment/access/ports/AuthSettings";

import { authSettingsSupabaseLayer } from "./AuthSettingsSupabase.ts";

/**
 * 인증 서버의 공개 설정을 실제 로컬 스택에서 읽는다. 첫 로그인에 계정을 잇기 직전에 쓰는 값이다
 * (INV-ACCESS-08).
 *
 * ⚠ **로컬의 기댓값은 `supabase/config.toml` 이 정한다.** 그 파일이 이메일 확인을 켜 두었으므로 여기서
 *    `true` 가 나와야 한다. 누가 그 줄을 끄면 이 검사가 먼저 빨강이 된다.
 */
const url = process.env.SUPABASE_STORAGE_URL ?? "";
const apiKey = process.env.SUPABASE_ANON_KEY ?? "";

if (!url.includes("127.0.0.1") && !url.includes("localhost"))
{
    throw new Error(`이 검사는 로컬 스택에만 붙는다 (지금: ${url})`);
}

const read = (layerUrl: string) =>
    Effect.flatMap(AuthSettings, (settings) => settings.emailConfirmationEnforced).pipe(
        Effect.provide(authSettingsSupabaseLayer({ url: layerUrl, apiKey })),
    );

describe("인증 서버의 공개 설정 (Supabase)", () =>
{
    it("로컬 Auth 의 설정을 읽어 이메일 확인이 켜져 있다고 답한다 — config.toml 이 켜 둔 값이다", async () =>
    {
        expect(await Effect.runPromise(read(url))).toBe(true);
    });

    it("응답을 받지 못하면 AuthSettingsUnavailable 로 답한다 — 꺼진 것과 읽지 못한 것을 섞지 않는다", async () =>
    {
        // 9 번은 discard 포트다. 로컬에서 아무도 듣지 않아 연결이 곧바로 거절된다
        const refused = await Effect.runPromise(Effect.flip(read("http://127.0.0.1:9")));
        const notFound = await Effect.runPromise(Effect.flip(read(`${url}/없는-자리`)));

        expect(refused._tag).toBe("AuthSettingsUnavailable");
        expect(notFound._tag).toBe("AuthSettingsUnavailable");
    });
});

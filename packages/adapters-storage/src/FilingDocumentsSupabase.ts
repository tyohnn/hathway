// ⚠ 이 import 가 게이트다. 이 모듈이 쥐는 키는 클라이언트 번들에 섞이면 빌드가 깨져야 한다.
import "server-only";

import { gunzipSync } from "node:zlib";

import { Effect, Layer } from "effect";

import type { RawSection } from "@investment/market/domain/rows";
import { FilingDocuments } from "@investment/market/ports/MarketStore";

/**
 * 공시 본문 조각의 Supabase Storage 구현.
 *
 * 조각은 표가 아니라 저장소에 공시마다 한 덩이(`docs/<회사>/<접수번호>.sections.json.gz`)로 들어 있다. 적재가 쓰고
 * 앱은 읽기만 한다. 버킷이 공개가 아니라서 service role 키로 읽는다. 앱이 그 키를 쥐는 자리는 이제 여기 하나다.
 *
 * ⚠ **읽지 못하면 `null` 이다. 던지지 않는다.** 덩이가 없는 것(관심 종목이 아니라 아직 추출하지 않은 공시)이 흔한
 *    경우라, 없거나 깨졌거나 닿지 못한 것을 모두 「조각이 없다」로 답한다. 조회 화면의 나머지는 선다.
 */
export interface FilingDocumentsSupabaseConfig
{
    readonly url: string;
    readonly serviceKey: string;
    /** 검사가 응답을 흉내 낼 때만 넘긴다 */
    readonly fetch?: typeof fetch;
}

const BUCKET = "platform-raw";

const TIMEOUT_MS = 10_000;

const isSection = (row: unknown): row is RawSection =>
{
    if (typeof row !== "object" || row === null)
    {
        return false;
    }

    const candidate = row as Record<string, unknown>;

    return typeof candidate["rcept_no"] === "string"
        && typeof candidate["sec_no"] === "number"
        && typeof candidate["title"] === "string"
        && typeof candidate["content"] === "string"
        && typeof candidate["is_note"] === "boolean"
        && typeof candidate["is_biz"] === "boolean";
};

const sectionsOf = (bytes: ArrayBuffer): ReadonlyArray<RawSection> | null =>
{
    try
    {
        const json: unknown = JSON.parse(gunzipSync(Buffer.from(bytes)).toString("utf-8"));

        return Array.isArray(json) ? json.filter(isSection) : null;
    }
    catch
    {
        return null;
    }
};

export const filingDocumentsSupabaseLayer = (config: FilingDocumentsSupabaseConfig): Layer.Layer<FilingDocuments> =>
{
    const request = config.fetch ?? fetch;

    return Layer.succeed(FilingDocuments, FilingDocuments.of({
        sections: (corpCode, rceptNo) =>
            Effect.tryPromise({
                try: async () =>
                {
                    const path = `docs/${encodeURIComponent(corpCode)}/${encodeURIComponent(rceptNo)}.sections.json.gz`;
                    const response = await request(`${config.url}/storage/v1/object/${BUCKET}/${path}`, {
                        headers: { authorization: `Bearer ${config.serviceKey}`, apikey: config.serviceKey },
                        signal: AbortSignal.timeout(TIMEOUT_MS),
                    });

                    return response.ok ? sectionsOf(await response.arrayBuffer()) : null;
                },
                catch: (cause) => cause,
            }).pipe(Effect.orElseSucceed(() => null)),
    }));
};

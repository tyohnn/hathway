import { gzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";
import { Effect } from "effect";

import { FilingDocuments } from "@investment/market/ports/MarketStore";

import { filingDocumentsSupabaseLayer } from "./FilingDocumentsSupabase.ts";

const sections = [
    { rcept_no: "R1", sec_no: 1, title: "주석", content: "본문", is_note: true, is_biz: false },
    { rcept_no: "R1", sec_no: 2, title: "사업의 내용", content: "본문 2", is_note: false, is_biz: true },
];

const gz = (value: unknown): Uint8Array<ArrayBuffer> => new Uint8Array(gzipSync(Buffer.from(JSON.stringify(value), "utf-8")));

const read = (respond: (url: string, init?: RequestInit) => Response | Promise<Response>) =>
    Effect.runPromise(
        Effect.flatMap(FilingDocuments, (documents) => documents.sections("00760971", "R1")).pipe(
            Effect.provide(filingDocumentsSupabaseLayer({
                url: "http://storage.test",
                serviceKey: "service-key",
                fetch: (input, init) => Promise.resolve(respond(String(input), init)),
            })),
        ),
    );

describe("공시 본문 조각 (Supabase Storage)", () =>
{
    it("gzip 으로 묶인 조각 목록을 풀어 읽는다", async () =>
    {
        expect(await read(() => new Response(gz(sections)))).toEqual(sections);
    });

    it("회사와 접수번호로 자리를 짓고 service role 키로 읽는다. 버킷은 공개가 아니다", async () =>
    {
        const seen: { url: string; headers: Headers }[] = [];

        await read((url, init) =>
        {
            seen.push({ url, headers: new Headers(init?.headers) });

            return new Response(gz(sections));
        });

        expect(seen[0]?.url).toBe("http://storage.test/storage/v1/object/platform-raw/docs/00760971/R1.sections.json.gz");
        expect(seen[0]?.headers.get("authorization")).toBe("Bearer service-key");
    });

    it("없는 덩이는 null 이다. 아직 추출되지 않은 공시다", async () =>
    {
        expect(await read(() => new Response("not found", { status: 404 }))).toBeNull();
    });

    it("깨진 덩이는 null 로 읽는다. 화면이 죽지 않는다", async () =>
    {
        expect(await read(() => new Response(new Uint8Array([1, 2, 3])))).toBeNull();
        expect(await read(() => new Response(gz({ not: "a list" })))).toBeNull();
    });

    it("모양이 다른 조각은 건너뛴다", async () =>
    {
        expect(await read(() => new Response(gz([sections[0], { sec_no: "x" }])))).toEqual([sections[0]]);
    });

    it("저장소에 닿지 못하면 null 이다. 조회 화면의 나머지는 선다", async () =>
    {
        expect(await read(() => Promise.reject(new Error("ECONNREFUSED")))).toBeNull();
    });
});

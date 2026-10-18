import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { MODEL_CALL_PROVIDER_OPTIONS } from "./modelCallOptions";

/**
 * 게이트웨이의 자동 캐시가 켜져 있는가.
 *
 * ⚠ **이 줄이 빠져도 어떤 검사도 빨갛게 되지 않았다.** 실행은 똑같이 돌고 답도 똑같이 나오며,
 *    달라지는 것은 청구서뿐이다(2026-09-23 · 입력의 99%가 캐시를 지나지 않았다). 그래서 값과
 *    그 값이 실제로 호출에 실리는지를 둘 다 본다.
 */
describe("모델 호출 옵션", () =>
{
    it("게이트웨이의 자동 캐시를 켠다. 없으면 도구를 부를 때마다 대화 전체가 온값으로 청구된다", () =>
    {
        assert.strictEqual(MODEL_CALL_PROVIDER_OPTIONS.gateway.caching, "auto");
    });

    it("워크플로의 에이전트가 그 옵션을 싣는다. 값만 있고 쓰이지 않으면 없는 것과 같다", () =>
    {
        const source = readFileSync(join(__dirname, "chat.ts"), "utf8");

        assert.include(source, "providerOptions: MODEL_CALL_PROVIDER_OPTIONS");
    });
});

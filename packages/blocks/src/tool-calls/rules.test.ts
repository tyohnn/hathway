import { describe, expect, it } from "vitest";

import { hasPending, isPending, needsGroup } from "./rules";
import type { ToolCall, ToolCallStatus } from "./types";

const call = (id: string, status: ToolCallStatus, output?: string): ToolCall =>
    ({ id, name: id, status, ...(output === undefined ? {} : { output }) });

describe("isPending", () =>
{
    it("도는 중과 승인 대기는 아직 끝나지 않았다", () =>
    {
        expect(isPending("running")).toBe(true);
        expect(isPending("awaiting_approval")).toBe(true);
    });

    it("거절과 실패도 끝난 것이다", () =>
    {
        expect(isPending("rejected")).toBe(false);
        expect(isPending("failed")).toBe(false);
    });

    it("끝난 것은 끝난 것이다", () =>
    {
        expect(isPending("succeeded")).toBe(false);
    });
});

describe("hasPending", () =>
{
    it("승인을 기다리는 호출이 섞여 있으면 참이다", () =>
    {
        expect(hasPending([call("a", "succeeded"), call("b", "awaiting_approval")])).toBe(true);
    });

    it("도는 중인 호출이 섞여 있으면 참이다", () =>
    {
        expect(hasPending([call("a", "succeeded"), call("b", "running")])).toBe(true);
    });

    it("전부 끝났으면 거짓이다", () =>
    {
        expect(hasPending([call("a", "succeeded"), call("b", "rejected"), call("c", "failed")])).toBe(false);
    });

    it("빈 목록은 기다릴 것이 없다", () =>
    {
        expect(hasPending([])).toBe(false);
    });
});

describe("needsGroup", () =>
{
    it("하나만 부른 묶음은 상자를 세우지 않는다 — 하나를 묶는 상자는 테두리만 늘린다", () =>
    {
        expect(needsGroup([call("a", "succeeded")])).toBe(false);
    });

    it("둘부터 상자를 세운다 — 묶는다는 말이 그때부터 뜻을 갖는다", () =>
    {
        expect(needsGroup([call("a", "succeeded"), call("b", "running")])).toBe(true);
    });

    it("빈 묶음도 상자를 세우지 않는다 — 셀 것이 없으면 접을 것도 없다", () =>
    {
        expect(needsGroup([])).toBe(false);
    });
});

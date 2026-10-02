import { describe, expect, it } from "vitest";

import { customerActor } from "@investment/access/testing/actor";

import { draftBoard } from "./draft.ts";

describe("새 보드", () =>
{
    it("INV-RESEARCH-04 테넌트와 만든 사람은 행위자에게서 온다. 입력이 고를 수 있는 칸이 아니다", () =>
    {
        const drafted = draftBoard(customerActor("3"), { theme: "stocks" }, () => "board-abc");

        expect(drafted).toMatchObject({ _tag: "Drafted", board: { tenantId: "2", createdBy: "3" } });
    });

    it("INV-RESEARCH-04 slug 는 서버가 짓는다. 입력이 고를 수 있는 칸이 아니다", () =>
    {
        const drafted = draftBoard(customerActor("3"), { theme: "stocks" }, () => "board-abc");

        expect(drafted).toMatchObject({ _tag: "Drafted", board: { slug: "board-abc" } });
    });

    it("제목을 주지 않으면 「새 보드」로 연다. 빈 그룹 하나가 함께 선다", () =>
    {
        const drafted = draftBoard(customerActor("3"), { theme: "real-estate" }, () => "id");

        expect(drafted).toMatchObject({
            _tag: "Drafted",
            board: { title: "새 보드", theme: "real-estate", tagline: "", groups: [{ title: "새 그룹", widgets: [] }] },
        });
    });

    it("제목이 121자면 만들지 않는다", () =>
    {
        expect(draftBoard(customerActor("3"), { theme: "stocks", title: "가".repeat(120) }, () => "id")._tag).toBe("Drafted");
        expect(draftBoard(customerActor("3"), { theme: "stocks", title: "가".repeat(121) }, () => "id")).toEqual({
            _tag: "Rejected", message: "제목은 120자까지 쓸 수 있어요.",
        });
    });
});

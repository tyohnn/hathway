import { describe, expect, it } from "vitest";

import { customerActor } from "@investment/access/testing/actor";

import { draftBoard, titleVerdict } from "./draft.ts";

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

    it("제목의 앞뒤 공백을 걷어 적는다", () =>
    {
        expect(titleVerdict("  양극재  ")).toEqual({ _tag: "Ok", title: "양극재" });
    });

    it("공백만 적은 제목은 거절한다. 목록에서 가리킬 이름이 없다", () =>
    {
        expect(titleVerdict("   ")).toEqual({ _tag: "Blank" });
        expect(draftBoard(customerActor("3"), { theme: "stocks", title: " " }, () => "id")).toEqual({ _tag: "BlankTitle" });
    });

    it("제목의 한도는 글자 수로 센다. 한글이 바이트로 세어져 먼저 잘리지 않는다", () =>
    {
        expect(titleVerdict("가".repeat(80))._tag).toBe("Ok");
        expect(titleVerdict("가".repeat(81))).toEqual({ _tag: "TooLong", limit: 80 });
    });
});

import { describe, expect, it } from "vitest";

import { customerActor, operatorActor, otherCustomerActor } from "@investment/access/testing/actor";

import type { Board } from "../domain/Board.ts";
import { editVerdict, removeVerdict } from "./edit.ts";

const board = (over: Partial<Board> = {}): Board => ({
    slug: "board-1",
    tenantId: "2",
    createdBy: "2",
    theme: "stocks",
    title: "양극재",
    tagline: "",
    groups: [],
    version: 3,
    ...over,
});

describe("보드를 고치는 판정", () =>
{
    it("INV-RESEARCH-02 같은 테넌트의 구성원은 보드를 고친다", () =>
    {
        expect(editVerdict(customerActor("3"), board(), 3)).toEqual({ _tag: "Allowed" });
    });

    it("INV-RESEARCH-02 만든 사람이 아니어도 같은 테넌트면 고친다. 보드는 사람이 아니라 테넌트의 것이다", () =>
    {
        expect(editVerdict(customerActor("9"), board({ createdBy: "2" }), 3)).toEqual({ _tag: "Allowed" });
    });

    it("INV-RESEARCH-02 다른 테넌트의 사람은 보드를 고치지 못한다. 없는 보드와 같은 답이다", () =>
    {
        expect(editVerdict(otherCustomerActor("4"), board(), 3)).toEqual({ _tag: "NotFound" });
        expect(editVerdict(otherCustomerActor("4"), null, 3)).toEqual({ _tag: "NotFound" });
    });

    it("INV-RESEARCH-02 운영팀이라고 고객사의 보드를 고치지 않는다. 우회는 이 함수 밖에 두지 않는다", () =>
    {
        expect(editVerdict(operatorActor("1", { role: "owner" }), board(), 3)).toEqual({ _tag: "NotFound" });
    });

    it("INV-RESEARCH-03 연 뒤에 판이 바뀌었으면 덮어쓰지 않고 지금의 판을 알려 준다", () =>
    {
        expect(editVerdict(customerActor("3"), board({ version: 5 }), 3)).toEqual({ _tag: "Stale", current: 5 });
    });
});

describe("보드를 지우는 판정", () =>
{
    it("INV-RESEARCH-02 같은 테넌트의 구성원은 보드를 지운다. 역할을 가리지 않는다", () =>
    {
        expect(removeVerdict(customerActor("3", { role: "member" }), board())).toEqual({ _tag: "Allowed" });
        expect(removeVerdict(customerActor("3", { role: "owner" }), board())).toEqual({ _tag: "Allowed" });
    });

    it("INV-RESEARCH-02 다른 테넌트의 사람은 보드를 지우지 못한다. 없는 보드와 같은 답이다", () =>
    {
        expect(removeVerdict(otherCustomerActor("4"), board())).toEqual({ _tag: "NotFound" });
        expect(removeVerdict(otherCustomerActor("4"), null)).toEqual({ _tag: "NotFound" });
    });
});

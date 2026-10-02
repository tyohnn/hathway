import { describe, expect, it } from "vitest";

import {
    canCommitTransition,
    formatDay,
    isEditable,
    parseDay,
    resolveEditKind,
    shouldCommit,
    toggleChoice,
    transitionChoices,
} from "./edit";
import type { PropertyEdit, TransitionEdit } from "./types";

const noop = () => {};

const TEXT: PropertyEdit = { kind: "text", value: "주주간계약 3차 검토", onCommit: noop };
const DATE: PropertyEdit = { kind: "date", value: "2026-09-25", onCommit: noop };
const SELECT: PropertyEdit = { kind: "select", value: "legal", options: [], onCommit: noop };
const MULTI: PropertyEdit = { kind: "multi", value: ["kim"], options: [], onCommit: noop };
const LOCKED: PropertyEdit = { kind: "locked", reason: "9월 청구가 나갔습니다" };
const DERIVED: PropertyEdit = { kind: "derived", from: "작업 이력을 더한 값" };

/** 갈 수 있는 곳은 도메인(`allowedTransitions`)이 준다. 여기서는 받은 것으로 친다 */
const TRANSITION: TransitionEdit = {
    kind: "transition",
    value: "awaiting_confirm",
    options: [
        { value: "in_progress", label: "진행" },
        { value: "completed", label: "완료" },
    ],
    onCommit: noop,
};

describe("resolveEditKind", () =>
{
    it("edit 가 없으면 지금처럼 읽기만 한다", () =>
    {
        expect(resolveEditKind(undefined)).toBe("none");
        expect(resolveEditKind(undefined, true)).toBe("none");
    });

    it("잠김과 셈한 값은 권한과 무관하게 그대로다", () =>
    {
        expect(resolveEditKind(LOCKED, true)).toBe("locked");
        expect(resolveEditKind(DERIVED, true)).toBe("derived");
    });

    it("열람권이 없으면 고치는 다섯이 셈한 값처럼 선다", () =>
    {
        for (const edit of [TEXT, DATE, SELECT, MULTI, TRANSITION])
        {
            expect(resolveEditKind(edit, true)).toBe("derived");
            expect(resolveEditKind(edit)).toBe(edit.kind);
        }
    });
});

describe("isEditable", () =>
{
    it("잠김과 셈한 값에는 커서가 서지 않는다", () =>
    {
        expect(isEditable("locked")).toBe(false);
        expect(isEditable("derived")).toBe(false);
        expect(isEditable("none")).toBe(false);
    });

    it("나머지 다섯은 누를 수 있다", () =>
    {
        for (const kind of ["text", "date", "select", "multi", "transition"] as const)
        {
            expect(isEditable(kind)).toBe(true);
        }
    });
});

describe("transitionChoices", () =>
{
    it("지금 상태는 갈 곳에 서지 않는다", () =>
    {
        const choices = transitionChoices({
            ...TRANSITION,
            options: [...TRANSITION.options, { value: "awaiting_confirm", label: "확인 대기" }],
        });

        expect(choices.map((choice) => choice.value)).toEqual(["in_progress", "completed"]);
    });

    it("받은 목록 밖의 것을 만들지 않는다", () =>
    {
        expect(transitionChoices({ ...TRANSITION, options: [] })).toEqual([]);
    });
});

describe("canCommitTransition", () =>
{
    it("허용되지 않은 곳으로는 확정하지 못한다", () =>
    {
        expect(canCommitTransition(TRANSITION, "pending", "되돌립니다")).toBe(false);
        expect(canCommitTransition(TRANSITION, "awaiting_confirm", "그대로")).toBe(false);
    });

    it("사유가 필요한데 비었으면 확정하지 못한다", () =>
    {
        const strict: TransitionEdit = { ...TRANSITION, reason: "required" };

        expect(canCommitTransition(strict, "in_progress", "   ")).toBe(false);
        expect(canCommitTransition(strict, "in_progress", "고객이 더 물어 왔습니다")).toBe(true);
    });

    it("사유를 받지 않기로 한 전이는 고르는 것으로 끝난다", () =>
    {
        expect(canCommitTransition({ ...TRANSITION, reason: "none" }, "completed", "")).toBe(true);
        expect(canCommitTransition(TRANSITION, "completed", "")).toBe(true);
    });
});

describe("shouldCommit", () =>
{
    it("값이 그대로면 저장하지 않는다", () =>
    {
        expect(shouldCommit("3시간", "3시간")).toBe(false);
    });

    it("앞뒤 공백만 다른 것도 그대로로 본다", () =>
    {
        expect(shouldCommit("  3시간 ", "3시간")).toBe(false);
    });

    it("달라졌으면 저장한다", () =>
    {
        expect(shouldCommit("4시간", "3시간")).toBe(true);
        expect(shouldCommit("", "3시간")).toBe(true);
    });
});

describe("toggleChoice", () =>
{
    it("고른 것을 다시 누르면 뺀다", () =>
    {
        expect(toggleChoice(["kim", "lee"], "kim")).toEqual(["lee"]);
    });

    it("없던 것은 뒤에 붙어 고른 차례를 지킨다", () =>
    {
        expect(toggleChoice(["kim"], "lee")).toEqual(["kim", "lee"]);
    });

    it("상한에 닿았으면 더 넣지 않는다", () =>
    {
        expect(toggleChoice(["kim", "lee"], "park", 2)).toEqual(["kim", "lee"]);
        expect(toggleChoice(["kim"], "park", 2)).toEqual(["kim", "park"]);
    });
});

describe("parseDay · formatDay", () =>
{
    it("yyyy-MM-dd 는 그 날의 자정으로 읽는다", () =>
    {
        const day = parseDay("2026-09-25");

        expect(day?.getFullYear()).toBe(2026);
        expect(day?.getMonth()).toBe(8);
        expect(day?.getDate()).toBe(25);
    });

    it("비었거나 모양이 아닌 것은 날짜가 아니다", () =>
    {
        expect(parseDay(undefined)).toBeUndefined();
        expect(parseDay("")).toBeUndefined();
        expect(parseDay("2026-09")).toBeUndefined();
    });

    it("고른 날이 UTC 로 밀리지 않는다", () =>
    {
        expect(formatDay(new Date(2026, 8, 25))).toBe("2026-09-25");
        expect(formatDay(new Date(2026, 0, 1))).toBe("2026-01-01");
    });

    it("읽고 다시 적으면 같은 날이다", () =>
    {
        expect(formatDay(parseDay("2026-09-25") as Date)).toBe("2026-09-25");
    });
});

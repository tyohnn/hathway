import { describe, expect, it } from "vitest";

import type { BoardChange, Group, Widget } from "../domain/Board.ts";
import { BOARD_LIMITS, limitVerdict } from "./limits.ts";

const widget = (over: Partial<Widget> = {}): Widget => ({
    id: "w1",
    kind: "note",
    title: "노트",
    layout: { i: "w1", x: 0, y: 0, w: 6, h: 4 },
    body: "",
    ...over,
});

const group = (over: Partial<Group> = {}): Group => ({
    id: "g1",
    title: "그룹",
    summary: "",
    layout: { i: "g1", x: 0, y: 0, w: 6, h: 8 },
    widgets: [widget()],
    ...over,
});

const change = (over: Partial<BoardChange> = {}): BoardChange => ({
    title: "보드",
    tagline: "",
    groups: [group()],
    ...over,
});

const OK = { _tag: "Ok" };

describe("보드가 넘지 못하는 한도 (INV-RESEARCH-05)", () =>
{
    it("제목은 비어 있어도 받는다. 지우고 다시 쓰는 사이에 자동 저장이 돈다", () =>
    {
        expect(limitVerdict(change({ title: "" }))).toEqual(OK);
    });

    it("제목은 120자까지 받는다", () =>
    {
        expect(limitVerdict(change({ title: "가".repeat(120) }))).toEqual(OK);
    });

    it("제목이 121자면 받지 않고 한도를 알려 준다. 그룹과 칸의 제목도 같다", () =>
    {
        const over = { _tag: "Over", message: "제목은 120자까지 쓸 수 있어요." };

        expect(limitVerdict(change({ title: "가".repeat(121) }))).toEqual(over);
        expect(limitVerdict(change({ groups: [group({ title: "가".repeat(121) })] }))).toEqual(over);
        expect(limitVerdict(change({ groups: [group({ widgets: [widget({ title: "가".repeat(121) })] })] }))).toEqual(over);
    });

    it("설명이 301자면 받지 않는다", () =>
    {
        expect(limitVerdict(change({ tagline: "가".repeat(300) }))).toEqual(OK);
        expect(limitVerdict(change({ tagline: "가".repeat(301) }))).toEqual({
            _tag: "Over", message: "설명은 300자까지 쓸 수 있어요.",
        });
    });

    it("그룹은 50개까지 받는다", () =>
    {
        expect(limitVerdict(change({ groups: Array.from({ length: 50 }, () => group()) }))).toEqual(OK);
    });

    it("그룹이 51개면 받지 않는다. 보드 하나가 문서 칸을 끝없이 키우지 못한다", () =>
    {
        expect(limitVerdict(change({ groups: Array.from({ length: 51 }, () => group()) }))).toEqual({
            _tag: "Over", message: "그룹은 50개까지 만들 수 있어요.",
        });
    });

    it("한 그룹의 칸은 50개까지 받는다", () =>
    {
        expect(limitVerdict(change({ groups: [group({ widgets: Array.from({ length: 50 }, () => widget()) })] }))).toEqual(OK);
    });

    it("한 그룹의 칸이 51개면 받지 않는다", () =>
    {
        expect(limitVerdict(change({ groups: [group({ widgets: Array.from({ length: 51 }, () => widget()) })] }))).toEqual({
            _tag: "Over", message: "한 그룹에는 카드를 50개까지 둘 수 있어요.",
        });
    });

    it("노트 본문은 20000자까지 받는다", () =>
    {
        expect(limitVerdict(change({ groups: [group({ widgets: [widget({ body: "가".repeat(20000) })] })] }))).toEqual(OK);
    });

    it("노트 본문이 20001자면 받지 않는다", () =>
    {
        expect(limitVerdict(change({ groups: [group({ widgets: [widget({ body: "가".repeat(20001) })] })] }))).toEqual({
            _tag: "Over", message: "노트는 20,000자까지 쓸 수 있어요.",
        });
    });

    it("링크는 http 와 https 와 / 로 시작하는 경로만 받는다. 화면이 그 값을 그대로 href 에 넣는다", () =>
    {
        const withHref = (href: string) =>
            limitVerdict(change({ groups: [group({ widgets: [widget({ kind: "link", href })] })] }))._tag;

        expect(withHref("https://dart.fss.or.kr/dsaf001/main.do?rcpNo=1")).toBe("Ok");
        expect(withHref("http://example.com")).toBe("Ok");
        expect(withHref("/stocks/analysis/247540")).toBe("Ok");
        expect(withHref("mailto:a@example.com")).toBe("Over");
        expect(withHref("stocks/analysis")).toBe("Over");
    });

    it("javascript: 와 // 로 시작하는 링크는 받지 않는다. 칸 안의 항목도 같다", () =>
    {
        const withItemHref = (href: string) =>
            limitVerdict(change({
                groups: [group({ widgets: [widget({ kind: "news", items: [{ title: "기사", href }] })] })],
            }));

        expect(withItemHref("javascript:alert(1)")).toEqual({ _tag: "Over", message: "링크는 https:// 나 / 로 시작해야 해요." });
        expect(withItemHref("//evil.example")._tag).toBe("Over");
        expect(withItemHref("/\\evil.example")._tag).toBe("Over");
        expect(withItemHref("/book")).toEqual(OK);
    });

    it("한도의 값은 한 곳에 있다", () =>
    {
        expect(BOARD_LIMITS).toMatchObject({ title: 120, tagline: 300, body: 20000, groups: 50, widgets: 50 });
    });
});

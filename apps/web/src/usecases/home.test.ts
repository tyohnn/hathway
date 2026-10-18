import { describe, expect, it } from "vitest";

import type { MemberRow } from "@hathway/access/ports/TeamDirectory";
import type { Note } from "@hathway/notes/domain/Note";

import { planHome } from "./home";

/**
 * 홈이 무엇을 보이는가(`/ia-design` 의 대시보드 해부도 3번). 위에서부터 루프 진입점 → 처리할 것 → 최근이고, 첫날에는 최근 대신
 * 시작 점검표가 선다. 무엇을 볼 수 있는지는 이미 판정을 지난 목록(`listNotes` · `listTeam`)이 정하고, 여기서는 그것을 홈의 칸으로 나눈다.
 */
const note = (id: string, createdAt: string, overrides: Partial<Note> = {}): Note => ({
    id,
    tenantId: "2",
    authorId: "3",
    title: `쪽지 ${id}`,
    body: "",
    visibility: "tenant",
    status: "active",
    version: 1,
    createdAt,
    ...overrides,
});

const member = (accountId: string, pending = false): MemberRow => ({
    membershipId: `m${accountId}`,
    accountId,
    tenantId: "2",
    role: "member",
    email: `${accountId}@example.test`,
    name: null,
    pending,
});

const me = "2";

describe("홈", () =>
{
    it("최근 쪽지는 보관하지 않은 것을 새것부터 다섯까지 보인다. 보관한 것은 이어 할 일이 아니다", () =>
    {
        const notes = [
            note("1", "2026-10-01T00:00:00Z"),
            note("2", "2026-10-06T00:00:00Z"),
            note("3", "2026-10-05T00:00:00Z", { status: "archived" }),
            note("4", "2026-10-04T00:00:00Z"),
            note("5", "2026-10-03T00:00:00Z"),
            note("6", "2026-10-02T00:00:00Z"),
            note("7", "2026-09-30T00:00:00Z"),
        ];

        const plan = planHome({ me, notes, members: [member(me)], canManage: false });

        expect(plan.recent?.map((entry) => entry.id)).toEqual(["2", "4", "5", "6", "1"]);
        expect(plan.checklist).toBeNull();
    });

    it("이어 할 쪽지가 하나도 없으면 최근 대신 시작 점검표가 선다", () =>
    {
        const plan = planHome({ me, notes: [note("1", "2026-10-01T00:00:00Z", { status: "archived" })], members: [member(me)], canManage: false });

        expect(plan.recent).toBeNull();
        expect(plan.checklist?.map((item) => item.kind)).toEqual(["first-note", "connect"]);
    });

    it("점검표의 첫 쪽지는 내가 쓴 쪽지가 있으면 끝난 것이다. 보관했어도 쓴 것이다", () =>
    {
        const mine = planHome({ me, notes: [note("1", "2026-10-01T00:00:00Z", { authorId: me, status: "archived" })], members: [member(me)], canManage: false });
        const theirs = planHome({ me, notes: [note("1", "2026-10-01T00:00:00Z", { status: "archived" })], members: [member(me)], canManage: false });

        expect(mine.checklist?.find((item) => item.kind === "first-note")?.done).toBe(true);
        expect(theirs.checklist?.find((item) => item.kind === "first-note")?.done).toBe(false);
    });

    it("멤버 초대는 팀을 관리할 수 있는 사람의 점검표에만 선다. 초대 단추가 없는 사람에게 할 일을 주지 않는다", () =>
    {
        const manager = planHome({ me, notes: [], members: [member(me)], canManage: true });
        const memberOnly = planHome({ me, notes: [], members: [member(me)], canManage: false });

        expect(manager.checklist?.map((item) => item.kind)).toEqual(["first-note", "invite", "connect"]);
        expect(memberOnly.checklist?.some((item) => item.kind === "invite")).toBe(false);
    });

    it("팀에 나 말고 한 사람이라도 있으면 초대는 끝난 것이다. 아직 로그인하지 않은 사람도 초대한 사람이다", () =>
    {
        const alone = planHome({ me, notes: [], members: [member(me)], canManage: true });
        const invited = planHome({ me, notes: [], members: [member(me), member("9", true)], canManage: true });

        expect(alone.checklist?.find((item) => item.kind === "invite")?.done).toBe(false);
        expect(invited.checklist?.find((item) => item.kind === "invite")?.done).toBe(true);
    });

    it("초대받고 아직 로그인하지 않은 사람은 팀을 관리할 수 있는 사람에게만 처리할 것으로 선다", () =>
    {
        const members = [member(me), member("9", true), member("10", true), member("11")];

        expect(planHome({ me, notes: [], members, canManage: true }).todos).toEqual([{ kind: "pending-invites", count: 2 }]);
        expect(planHome({ me, notes: [], members, canManage: false }).todos).toEqual([]);
    });

    it("기다리는 초대가 없으면 처리할 것이 비어 있다. 지어낸 할 일을 세우지 않는다", () =>
    {
        expect(planHome({ me, notes: [], members: [member(me), member("11")], canManage: true }).todos).toEqual([]);
    });
});

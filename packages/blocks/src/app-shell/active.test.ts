import { assert, describe, it } from "vitest";

import { Building } from "@investment/ui/icons";

import { activeNavItem, activeTrail } from "./active";
import type { AppShellNavItem } from "./types";

/**
 * 어느 항목이 켜지는가.
 *
 * ⚠ 가장 긴 기준이 이겨야 한다. advisor 가 `/materials` 와 `/materials/ocr` 을 둘 다 갖고 있어서,
 *    앞에서부터 찾으면 도구 화면에서 자료 항목이 켜진다.
 */
const item = (
    label: string,
    base: string,
    children?: ReadonlyArray<AppShellNavItem>,
): AppShellNavItem => ({
    label,
    base,
    icon: Building,
    // 링크 요소는 앱이 넘기는 값이라 여기서는 자리만 채운다
    render: { type: "a", props: {}, key: null } as unknown as AppShellNavItem["render"],
    ...(children === undefined ? {} : { children }),
});

const GROUPS = [
    [item("대시보드", "/dashboard"), item("태스크", "/tasks")],
    [item("자료", "/materials"), item("도구", "/materials/ocr")],
];

describe("켜진 항목", () =>
{
    it("그 주소의 항목이 켜진다", () =>
    {
        assert.strictEqual(activeNavItem(GROUPS, "/tasks")?.label, "태스크");
    });

    it("하위 화면도 그 항목으로 묶인다 — 상세를 열어도 위치를 잃지 않는다", () =>
    {
        assert.strictEqual(activeNavItem(GROUPS, "/tasks/7")?.label, "태스크");
    });

    it("가장 긴 기준이 이긴다 — 도구 화면에서 자료가 켜지지 않는다", () =>
    {
        assert.strictEqual(activeNavItem(GROUPS, "/materials/ocr")?.label, "도구");
        assert.strictEqual(activeNavItem(GROUPS, "/materials")?.label, "자료");
    });

    it("앞 조각이 같기만 한 주소는 켜지 않는다", () =>
    {
        assert.isUndefined(activeNavItem(GROUPS, "/tasksomething"));
    });

    it("어느 항목에도 없으면 아무것도 켜지지 않는다 — 상단 띠가 기본 문구로 떨어진다", () =>
    {
        assert.isUndefined(activeNavItem(GROUPS, "/no-access"));
    });
});

/**
 * 묶음 안의 항목.
 *
 * ⚠ 아래 항목의 주소가 위 항목의 주소로 시작하지 않는다. 「실행」은 `/runs` 이지만 사람에게는 「에이전트」
 *    안의 일이고, 그 묶음은 주소가 아니라 `children` 이 말한다.
 */
const NESTED = [
    [item("에이전트", "/agents", [item("실행", "/runs")]), item("스킬", "/skills")],
];

describe("묶음 안의 항목", () =>
{
    it("아래 항목도 켜진다 — 아래에 있다고 덜 켜지는 것이 아니다", () =>
    {
        assert.strictEqual(activeNavItem(NESTED, "/runs")?.label, "실행");
    });

    it("아래 항목의 하위 화면도 그 항목으로 묶인다", () =>
    {
        assert.strictEqual(activeNavItem(NESTED, "/runs/wrun_1")?.label, "실행");
    });

    it("위 항목의 주소에서는 위 항목이 켜진다", () =>
    {
        assert.strictEqual(activeNavItem(NESTED, "/agents")?.label, "에이전트");
    });

    it("아래 항목에 서면 품은 항목과 함께 둘을 낸다 — 띠가 어디 안에 있는지를 적는다", () =>
    {
        assert.deepStrictEqual(
            activeTrail(NESTED, "/runs").map((each) => each.label),
            ["에이전트", "실행"],
        );
    });

    it("위 항목에 서면 하나다 — 없는 겹을 지어내지 않는다", () =>
    {
        assert.deepStrictEqual(activeTrail(NESTED, "/agents").map((each) => each.label), ["에이전트"]);
    });

    it("어느 항목에도 서 있지 않으면 빈 길이다", () =>
    {
        assert.deepStrictEqual(activeTrail(NESTED, "/login"), []);
    });

    it("품지 않은 항목은 길에 끼지 않는다", () =>
    {
        assert.deepStrictEqual(activeTrail(NESTED, "/skills").map((each) => each.label), ["스킬"]);
    });
});

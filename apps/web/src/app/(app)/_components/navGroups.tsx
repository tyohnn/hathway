"use client";

import Link from "next/link";

import type { AppShellNavItem } from "@hathway/blocks/app-shell";

import { MODULE_NAV } from "@/lib/moduleNav";
import { footerNavigation, navigation, type NavEntry, type SettingsGroup } from "@/lib/paths";

/**
 * 셸이 받는 메뉴 한 벌. 정본(`lib/paths.ts` 의 `navigation` · `footerNavigation` 과 모듈의 메뉴)에서 자리마다 다시 뽑는다.
 *
 * | 자리 | 무엇 |
 * |---|---|
 * | 사이드바 | 개인 묶음 → 객체 메뉴(코어) → 모듈마다의 묶음. 설정 자리의 메뉴는 서지 않는다 |
 * | 사이드바 발치 | 설정 · 문서 |
 * | 설정의 옆 메뉴 | 설정 자리의 메뉴를 개인 → 조직 → 결제 갈래로 |
 * | 위 띠의 위치 | 사이드바와 「설정 › 팀」처럼 설정 안의 자리까지 |
 * | ⌘K 팔레트 | 위의 모든 이동 |
 *
 * ⚠ **클라이언트 모듈이다.** 항목이 드는 `icon` 은 컴포넌트 참조이고 `render` 는 `<Link>` 라, 서버에서
 *    만들어 클라이언트로 넘기면 직렬화되지 않는다. 목록의 정본은 순수 데이터로 두고 요소로 빚는 일을 여기서 한다.
 * ⚠ **결제하지 않는 조직(운영팀)의 메뉴가 기본이다.** 행위자를 알기 전에도 그것이 선다. 기다리는 동안 「요금제」가 떴다가
 *    사라지는 것보다, 결제하는 조직에서 한 줄이 늦게 서는 편이 덜 흔들린다.
 */
const ALL: ReadonlyArray<NavEntry> = [...navigation, ...MODULE_NAV];

const visible = (billable: boolean) => (entry: NavEntry): boolean => billable || entry.billableOnly !== true;

const itemOf = (entry: NavEntry): AppShellNavItem =>
    ({ label: entry.label, base: entry.match, icon: entry.icon, render: <Link href={entry.href} /> });

/** 사이드바의 묶음. 개인 묶음이 맨 위이고, 그 아래 묶음(`section`)이 처음 나온 차례대로 선다 */
const sidebarFor = (billable: boolean): ReadonlyArray<ReadonlyArray<AppShellNavItem>> =>
{
    const entries = ALL.filter(visible(billable)).filter((entry) => entry.place !== "settings");
    const personal = entries.filter((entry) => entry.place === "personal").map(itemOf);
    const sections = new Map<string, AppShellNavItem[]>([["", []]]);

    for (const entry of entries.filter((item) => item.place !== "personal"))
    {
        const section = entry.section ?? "";

        sections.set(section, [...(sections.get(section) ?? []), itemOf(entry)]);
    }

    return [personal, ...sections.values()].filter((group) => group.length > 0);
};

const SETTINGS_GROUPS: ReadonlyArray<{ readonly group: SettingsGroup; readonly label: string }> = [
    { group: "personal", label: "개인" },
    { group: "organization", label: "조직" },
    { group: "billing", label: "결제" },
];

/** 설정의 옆 메뉴 한 갈래 */
export interface SettingsSection
{
    readonly label: string;
    readonly items: ReadonlyArray<NavEntry>;
}

const settingsFor = (billable: boolean): ReadonlyArray<SettingsSection> =>
{
    const entries = ALL.filter(visible(billable)).filter((entry) => entry.place === "settings");

    return SETTINGS_GROUPS
        .map(({ group, label }) => ({ label, items: entries.filter((entry) => (entry.settingsGroup ?? "personal") === group) }))
        .filter((section) => section.items.length > 0);
};

export const GROUPS = sidebarFor(false);
export const BILLABLE_GROUPS = sidebarFor(true);

export const FOOTER_GROUPS: ReadonlyArray<ReadonlyArray<AppShellNavItem>> = [footerNavigation.map(itemOf)];

export const SETTINGS = settingsFor(false);
export const BILLABLE_SETTINGS = settingsFor(true);

/**
 * 위 띠가 위치를 찾는 메뉴. 발치의 「설정」 아래에 설정의 메뉴를 품어서 「설정 › 팀」으로 읽힌다.
 *
 * ⚠ 이 묶음은 위치를 찾는 데만 쓴다. 사이드바에 그리면 설정 안에서 아래 항목이 펴져 옆 메뉴와 두 번 선다.
 */
export const TITLE_GROUPS: ReadonlyArray<ReadonlyArray<AppShellNavItem>> = [
    ...BILLABLE_GROUPS,
    footerNavigation.map((entry) =>
        entry.match === "/settings"
            ? { ...itemOf(entry), children: BILLABLE_SETTINGS.flatMap((section) => section.items.map(itemOf)) }
            : itemOf(entry)),
];

/** ⌘K 팔레트의 이동 한 줄 */
export interface PaletteEntry
{
    readonly label: string;
    readonly href: string;
    readonly icon: NavEntry["icon"];
    /** 같은 이름이 둘이어도 고르는 값이 겹치지 않게 갈래를 붙인다(「설정 › 팀」) */
    readonly hint?: string;
}

/** 팔레트가 보이는 이동 전부. 사이드바 · 설정 · 발치의 차례다 */
export const paletteFor = (billable: boolean): ReadonlyArray<PaletteEntry> => [
    ...ALL.filter(visible(billable)).filter((entry) => entry.place !== "settings")
        .map((entry) => ({ label: entry.label, href: entry.href, icon: entry.icon })),
    ...settingsFor(billable).flatMap((section) => section.items
        .map((entry) => ({ label: entry.label, href: entry.href, icon: entry.icon, hint: "설정" }))),
    ...footerNavigation.filter((entry) => entry.match !== "/settings")
        .map((entry) => ({ label: entry.label, href: entry.href, icon: entry.icon })),
];

export const LABELS = { fallbackTitle: "Hathway 기업분석" };

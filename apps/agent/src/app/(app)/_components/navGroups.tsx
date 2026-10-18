"use client";

import Link from "next/link";

import type { AppShellNavItem } from "@hathway/blocks/app-shell";

import { navigation } from "@/lib/paths";

/**
 * 셸이 받는 메뉴 한 벌.
 *
 * ⚠ **클라이언트 모듈이다.** 항목이 드는 `icon` 은 컴포넌트 참조이고 `render` 는 `<Link>` 라, 서버에서
 *    만들어 클라이언트로 넘기면 직렬화되지 않는다. 목록의 정본(`lib/paths.ts`)은 순수 데이터로 두고
 *    요소로 빚는 일을 여기서 한다.
 */
export const GROUPS: ReadonlyArray<ReadonlyArray<AppShellNavItem>> = [
    navigation.map((item) => ({
        label: item.label,
        base: item.match,
        icon: item.icon,
        render: <Link href={item.href} />,
    })),
];

export const LABELS = { fallbackTitle: "Hathway Agent" };

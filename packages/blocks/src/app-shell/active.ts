import type { AppShellNavItem } from "./types";

/** 위 항목과 그 아래 항목을 한 줄로 편다. 켜진 것을 고르는 일은 겹을 가리지 않는다 */
const flattened = (
    groups: ReadonlyArray<ReadonlyArray<AppShellNavItem>>,
): ReadonlyArray<AppShellNavItem> =>
    groups.flat().flatMap((item) => [item, ...(item.children ?? [])]);

/**
 * 지금 서 있는 항목.
 *
 * ⚠ **가장 긴 기준이 이긴다.** `/materials/ocr` 은 `/materials` 로도 시작하므로 앞에서부터 찾으면
 *    도구 화면에서 자료 항목이 켜진다. advisor 가 실제로 그 조합을 갖고 있다.
 *
 * ⚠ **아래 항목도 후보다.** 아래에 있다고 덜 켜지는 것이 아니다 - 사람은 자기가 선 자리가 켜져 있기를
 *    바라고, 그것이 묶음 안이든 밖이든 다르지 않다.
 */
export const activeNavItem = (
    groups: ReadonlyArray<ReadonlyArray<AppShellNavItem>>,
    pathname: string,
): AppShellNavItem | undefined =>
{
    let found: AppShellNavItem | undefined;

    for (const item of flattened(groups))
    {
        const matched = pathname === item.base || pathname.startsWith(`${item.base}/`);

        if (matched && (found === undefined || item.base.length > found.base.length))
        {
            found = item;
        }
    }

    return found;
};

/**
 * 지금 서 있는 자리까지의 길.
 *
 * 켜진 것이 아래 항목이면 그것을 품은 위 항목과 함께 둘을 낸다. 위 항목이면 하나다. 상단 띠가 이 길을
 * 그대로 적어서, 「실행」에 서 있는 사람이 그것이 「에이전트」 안의 일임을 화면에서 읽는다.
 *
 * ⚠ **주소로 품은 관계를 재지 않는다.** 아래 항목의 주소가 위 항목의 주소로 시작하지 않을 수 있고
 *    (`types.ts` 참조), 그것이 이 묶음이 화면의 것이지 주소의 것이 아닌 까닭이다. 품은 관계는 오직
 *    `children` 이 말한다.
 */
export const activeTrail = (
    groups: ReadonlyArray<ReadonlyArray<AppShellNavItem>>,
    pathname: string,
): ReadonlyArray<AppShellNavItem> =>
{
    const active = activeNavItem(groups, pathname);

    if (active === undefined)
    {
        return [];
    }

    const parent = groups.flat().find((item) => (item.children ?? []).includes(active));

    return parent === undefined ? [active] : [parent, active];
};

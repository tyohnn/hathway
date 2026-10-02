import type React from "react";

import type { IconComponent } from "@investment/ui/icons/names";

/**
 * 사이드바 항목 하나.
 *
 * ⚠ **주소를 문자열로 받지 않고 링크 요소를 받는다.** 블록은 Next 를 모르므로(`CLAUDE.md` 「역할과 경계」)
 *    `next/link` 를 여기서 부를 수 없다. 앱이 `render={<Link href={...} />}` 로 넘기고 블록은 그 자리에
 *    끼운다 — Base UI 의 `render` 규약과 같은 모양이다.
 */
export interface AppShellNavItem
{
    readonly label: string;
    /** 지금 이 항목의 화면에 있는지를 재는 기준. 하위 화면까지 이 항목으로 묶인다 */
    readonly base: string;
    readonly icon: IconComponent;
    /** 이 항목을 그릴 요소. 앱이 `<Link href={...} />` 를 넘긴다 */
    readonly render: React.ReactElement;

    /**
     * 이 항목 아래에 서는 항목들.
     *
     * ⚠ **주소의 계층이 아니라 화면의 묶음이다.** 아래 항목의 `base` 가 위 항목의 `base` 로 시작할
     *    필요가 없다 — 「실행」은 `/runs` 이지만 사람에게는 「에이전트」 안의 일이다. 주소를 굳이 맞추면
     *    지난 링크가 깨지고, 그 값을 치를 까닭이 화면의 묶음 하나뿐이다.
     *
     * ⚠ **두 겹까지다.** 세 겹이 필요해지면 그것은 메뉴가 아니라 화면 안의 항해다.
     */
    readonly children?: ReadonlyArray<AppShellNavItem>;
}

/** 사이드바 머리의 브랜드 한 줄 */
export interface AppShellBrand
{
    /** 네모 안에 들어가는 한 글자 */
    readonly mark: string;
    /** 접히면 사라지는 이름 */
    readonly name: string;
    /** 이름을 감쌀 요소. 앱이 `<Link href={...} />` 를 넘긴다 */
    readonly render: React.ReactElement<React.AnchorHTMLAttributes<HTMLAnchorElement>>;
}

/** 지금 주소를 아는 두 조각이 함께 받는 것 */
export interface AppShellNavProps
{
    readonly groups: ReadonlyArray<ReadonlyArray<AppShellNavItem>>;
    /** 지금 주소. 빈 문자열이면 아무 항목도 켜지지 않는다 */
    readonly pathname: string;
}

export interface AppShellTitleProps extends AppShellNavProps
{
    readonly labels?: Partial<AppShellLabels>;
}

export interface AppShellProps
{
    readonly brand: AppShellBrand;
    /** 묶음마다 사이에 구분선이 선다. 기다리는 동안 그릴 목록을 셸이 이것으로 만든다 */
    readonly groups: ReadonlyArray<ReadonlyArray<AppShellNavItem>>;
    /**
     * 지금 주소를 아는 항목 목록. 앱이 `usePathname()` 을 읽어 `<AppShellNav>` 를 넘긴다.
     *
     * ⚠ **셸이 이것을 `<Suspense>` 로 감싼다.** 주소는 요청 시점 값이라 경계가 없으면 동적 라우트의
     *    프리렌더가 실패한다. 경계를 셸이 갖는 까닭은 기다리는 동안 그릴 모습도 셸의 것이기 때문이다.
     */
    readonly nav: React.ReactNode;
    /** 상단 띠의 현재 위치. 앱이 `<AppShellTitle>` 을 넘긴다. 같은 이유로 셸이 감싼다 */
    readonly title: React.ReactNode;
    /** 사이드바 아래에 서는 계정 자리. 앱이 `<Suspense>` 로 감싸 넘긴다 */
    readonly user: React.ReactNode;
    readonly children: React.ReactNode;

    /**
     * 본문이 셸의 틀을 쓰는가.
     *
     * - `well`(기본) — 상단 띠가 서고 본문이 가운데 우물 안에 든다. 목록과 상세처럼 **화면 하나가
     *   한 덩이인** 자리의 모양이다.
     * - `full` — 띠도 우물도 없고 본문이 남은 자리를 통째로 쓴다. **기둥마다 제 머리를 갖는**
     *   화면이 쓴다. 대화와 산출물과 상태가 나란히 서는 자리가 그렇고, 셸이 그 위에 띠를 하나 더
     *   그으면 어느 머리가 어느 기둥의 것인지 읽히지 않는다.
     *
     * ⚠ **`full` 이면 사이드바 여닫기도 본문이 갖는다.** 셸이 띠를 그리지 않으므로 `SidebarTrigger`
     *    를 놓을 자리가 본문뿐이다. 놓지 않으면 접은 사이드바를 다시 펼 길이 사라진다.
     *
     * ⚠ **`full` 이면 문서가 구르지 않는다.** 셸이 화면 높이에 묶이므로 넘치는 것은 본문이 제 안에서
     *    굴려야 한다. 굴리지 않으면 넘친 만큼 잘린다.
     */
    readonly layout?: "well" | "full";

    readonly labels?: Partial<AppShellLabels>;
    readonly className?: string;
}

export interface AppShellLabels
{
    /** 어느 항목에도 서 있지 않을 때 상단 띠에 적을 말 */
    readonly fallbackTitle: string;
    readonly signOut: string;
}

/** form 의 action 에 그대로 실리는 서버 액션. 블록은 그것이 무엇을 하는지 모른다 */
export type SignOutAction = (formData: FormData) => void | Promise<void>;

/**
 * 계정이 오기 전에는 `loading` 으로 세운다. 이름 자리만 막대이고 「로그아웃」 단추는 같은 자리에 꺼진 채 선다.
 */
export type AppShellAccountProps =
    | AppShellAccountReady
    | { readonly loading: true; readonly labels?: Partial<AppShellLabels> };

export interface AppShellAccountReady
{
    readonly loading?: false;
    /** 지금 들어와 있는 계정. 앱이 세션에서 읽어 넘긴다 */
    readonly email: string;
    /** 사람이 정한 이름. 있으면 이메일 대신 적는다. 없으면 이메일이 그 자리에 선다 */
    readonly name?: string;
    /**
     * 어느 조직으로 들어와 있는지 한 줄. 여러 조직을 오가는 사람에게만 뜻이 있어서 주지 않으면 서지 않는다.
     * ⚠ 앱 이름을 넣지 않는다. 사이드바 머리가 이미 앱 이름이다
     */
    readonly org?: string;
    readonly onSignOut: SignOutAction;
    readonly labels?: Partial<AppShellLabels>;
}

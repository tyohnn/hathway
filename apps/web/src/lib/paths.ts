import { Account, BookOpen, FileText, Home, Settings, Users } from "@hathway/ui/icons";

import type { IconComponent } from "@hathway/ui/icons/names";

/**
 * 라우트를 만드는 단 한 곳.
 *
 * ⚠ **절대 경로를 문자열로 박지 않는다.** 주소 형태가 바뀌는 날 전수 검사를 하게 되고, 하나를 빠뜨리면
 *    그 링크만 조용히 깨진다. 메뉴와 리다이렉트와 알림이 조립하는 고리가 모두 이 헬퍼를 지난다.
 * ⚠ **라우트는 이 앱의 것이다.** 도메인 패키지가 주소를 알기 시작하면 앱마다 다른 화면 구조가 그리로
 *    새어 들어간다(`packages/access` 의 `entryOutcome` 이 어휘만 돌려주는 까닭과 같다).
 */
type QueryValue = string | number | undefined;

/** 쿼리를 붙인다. 모듈의 경로(`modules/<이름>/paths.ts`)도 이 함수를 지난다 */
export const withQuery = (path: string, query: Readonly<Record<string, QueryValue>>): string =>
{
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query))
    {
        // 빈 값을 키로 남기지 않는다. `?error=` 가 붙으면 같은 화면의 주소가 여럿이 된다
        if (value === undefined || value === "")
        {
            continue;
        }

        params.set(key, String(value));
    }

    const search = params.toString();

    return search === "" ? path : `${path}?${search}`;
};

export const paths = {
    /** 로그인하지 않아도 보이는 첫 화면 */
    landing: (): string => "/",
    /** 개인정보 처리방침과 이용약관. 로그인 없이 보이고, 발치와 로그인 화면이 잇는다 */
    privacy: (): string => "/privacy",
    terms: (): string => "/terms",
    blog: (): string => "/blog",
    post: (slug: string): string => `/blog/${encodeURIComponent(slug)}`,
    docs: (slug?: string): string => (slug === undefined ? "/docs" : `/docs/${encodeURIComponent(slug)}`),
    changelog: (): string => "/changelog",
    release: (version: string): string => `/changelog/${encodeURIComponent(version)}`,
    /** 로그인한 사람이 처음 가는 자리. 루프 진입점 · 처리할 것 · 최근이 서는 홈이다(`app/(app)/home`) */
    home: (): string => "/home",
    /** 쪽지 목록. 찾는 말과 쪽 번호가 주소에 남는다(`?q=` · `?page=`). 빈 값과 첫 쪽은 적지 않는다 */
    notes: (query?: { readonly q: string; readonly page: number }): string =>
    {
        const params = new URLSearchParams();

        if (query !== undefined && query.q !== "")
        {
            params.set("q", query.q);
        }

        if (query !== undefined && query.page > 1)
        {
            params.set("page", String(query.page));
        }

        const search = params.toString();

        return search === "" ? "/notes" : `/notes?${search}`;
    },
    /** 새 쪽지. 쪽지 화면에서 누르면 다이얼로그로 열리고(가로챈 라우트), 주소로 바로 오면 전체 페이지다 */
    newNote: (): string => "/notes/new",
    note: (noteId: string): string => `/notes/${encodeURIComponent(noteId)}`,
    /** 설정의 첫 화면. 설정은 사이드바의 한 줄이고 들어가면 제 옆 메뉴가 선다(`app/(app)/settings/layout.tsx`) */
    settings: (): string => "/settings/account",
    team: (): string => "/settings/team",
    account: (): string => "/settings/account",
    login: (redirect?: string, error?: "failed" | "credentials"): string => withQuery("/login", { redirect, error }),
    noAccess: (): string => "/no-access",
};

/**
 * 메뉴가 서는 자리. `/ia-design` 의 대시보드 해부도(`references/dashboard.md` 2번)를 따른다.
 *
 * - `personal`: 사이드바 맨 위의 개인 묶음(홈 · 받은 것 · 내 일). 「나」를 기준으로 거른 관점이다. 셋을 넘기지 않는다
 * - `objects`(기본): 객체 메뉴. 다섯에서 일곱
 * - `settings`: 사이드바에 서지 않고 설정의 옆 메뉴에 선다. 사이드바에는 발치의 「설정」 한 줄만 있다
 */
export type NavPlace = "personal" | "objects" | "settings";

/** 설정의 옆 메뉴에서 묶는 갈래. 개인 → 조직 → 결제 차례로 선다 */
export type SettingsGroup = "personal" | "organization" | "billing";

/** 메뉴 한 줄. 모듈도 같은 모양으로 메뉴를 낸다(`lib/moduleNav.ts`) */
export interface NavEntry
{
    readonly label: string;
    readonly href: string;
    readonly match: string;
    readonly icon: IconComponent;
    /** 결제하는 조직에만 선다. 운영팀은 요금제 없이 쓴다(`(app)/_components/ActorNav.tsx`) */
    readonly billableOnly?: boolean;
    /**
     * 사이드바에서 함께 설 묶음. 같은 값끼리 한 묶음이 되고 묶음 사이에 구분선이 선다. 주지 않으면 맨 위의 코어 묶음에 선다.
     * 화면이 여럿인 모듈이 제 메뉴를 코어 메뉴와 갈라 세울 때 쓴다
     */
    readonly section?: string;
    /** 서는 자리. 주지 않으면 객체 메뉴다 */
    readonly place?: NavPlace;
    /** `place` 가 `settings` 일 때 옆 메뉴의 어느 갈래에 서는가. 주지 않으면 개인이다 */
    readonly settingsGroup?: SettingsGroup;
}

/**
 * 사이드바의 코어 메뉴. 서버와 클라이언트가 함께 읽는 순수 데이터다. 모듈의 메뉴는 `lib/moduleNav.ts` 가 뒤에 잇는다.
 *
 * ⚠ 요소(`<Link>`)로 빚는 일은 클라이언트 모듈(`(app)/_components/navGroups.tsx`)이 한다. 아이콘은
 *    컴포넌트 참조라 서버에서 요소로 만들어 넘기면 직렬화되지 않는다.
 */
export const navigation: ReadonlyArray<NavEntry> = [
    { label: "홈", href: paths.home(), match: "/home", icon: Home, place: "personal" },
    { label: "쪽지", href: paths.notes(), match: "/notes", icon: FileText },
    { label: "내 계정", href: paths.account(), match: "/settings/account", icon: Account, place: "settings", settingsGroup: "personal" },
    { label: "팀", href: paths.team(), match: "/settings/team", icon: Users, place: "settings", settingsGroup: "organization" },
];

/**
 * 사이드바 발치의 메뉴. 가끔 가는 곳이라 맨 아래 계정 자리 바로 위에 선다.
 *
 * ⚠ 「설정」은 한 줄이다. 팀 · 내 계정 · 요금제를 사이드바에 따로 세우지 않는다. 설정 화면이 늘어도 사이드바는 그대로다.
 */
export const footerNavigation: ReadonlyArray<NavEntry> = [
    { label: "설정", href: paths.settings(), match: "/settings", icon: Settings },
    { label: "제품 문서", href: paths.docs(), match: "/docs", icon: BookOpen },
];

/**
 * 무엇을 새로 만들 수 있는가. 사이드바의 만들기 단추와 ⌘K 팔레트와 홈의 루프 진입점이 함께 읽는다. 객체가 늘면 줄이 는다.
 *
 * ⚠ 단추에 서는 글은 `action` 이다. 도착하는 폼의 제출 단추와 같은 동사로 쓴다(쪽지 폼의 「쪽지 쓰기」). 「새 쪽지」처럼 명사로 짓지 않는다.
 */
export interface CreateEntry
{
    readonly label: string;
    readonly action: string;
    readonly href: string;
    readonly icon: IconComponent;
}

export const creatables: ReadonlyArray<CreateEntry> = [
    { label: "쪽지", action: "쪽지 쓰기", href: paths.newNote(), icon: FileText },
];

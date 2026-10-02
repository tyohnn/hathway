import type React from "react";

import type { AppShellNavItem } from "../app-shell/types";

/**
 * 지난 대화 한 줄.
 *
 * ⚠ **주소를 문자열로 받지 않고 링크 요소를 받는다.** 블록은 Next 를 모른다(`CLAUDE.md`
 *    「역할과 경계」). `AppShellNavItem` 이 같은 모양이다.
 */
export interface ChatThread
{
    readonly id: string;
    readonly title: string;
    readonly render: React.ReactElement;
}

/**
 * 지난 대화를 묶는다.
 *
 * ⚠ **묶는 축은 언제 걸었나다.** 어느 에이전트였는지는 실행 목록에 있고, 사람이 지난 대화를 찾을
 *    때 먼저 떠올리는 것은 에이전트 이름이 아니라 언제였는지다. 그 접는 규칙은 도메인의 것이라
 *    호출부가 갖는다.
 */
export interface ChatThreadGroup
{
    readonly label: string;
    readonly threads: ReadonlyArray<ChatThread>;
}

export interface ChatNavProps
{
    /** 셸의 메뉴. 대화 목록 위에 그대로 선다 */
    readonly groups: ReadonlyArray<ReadonlyArray<AppShellNavItem>>;
    /**
     * 지금 서 있는 주소. 이 기둥이 대화 화면 밖에서도 서게 되면서 필요해졌다 (2026-09-23).
     *
     * ⚠ **켜진 항목을 앱이 다시 재지 않는다.** 여기 주소를 넘기면 `activeNavItem` 하나가 정한다.
     *    비우면 아무 항목도 켜지지 않는데, 대화 안에서는 켤 항목이 없는 것이 맞다.
     */
    readonly pathname?: string;
    readonly threads: ReadonlyArray<ChatThreadGroup>;
    /** 지금 보고 있는 대화. 빈 문자열이면 아무 줄도 켜지지 않는다 */
    readonly activeThreadId?: string;
    /** 새 대화를 여는 자리. 앱이 `<Link href={...} />` 를 넘긴다 */
    readonly newThread: React.ReactElement;
    readonly labels?: Partial<ChatShellLabels>;
}

export interface ChatPaneProps
{
    readonly title: string;
    /** 제목 앞. 사이드바 여닫기가 여기 선다. `full` 셸은 띠가 없어 놓을 자리가 본문뿐이다 */
    readonly lead?: React.ReactNode;
    /**
     * 제목 옆 한 마디.
     *
     * 지금 이 대화가 어떤 처지인지를 적는 자리다. 제목이 「무엇을 시켰나」에 답하고 이것이 「지금
     * 어떤가」에 답한다.
     *
     * ⚠ **속성을 늘어놓는 자리가 아니다**(2026-09-22 사용자 확정). 에이전트와 모델과 스킬은 실행을
     *    걸 때 고른 것이라 대화를 읽는 동안 다시 볼 일이 없고, 되짚을 자리는 실행 목록이다.
     */
    readonly note?: string;
    readonly actions?: React.ReactNode;

    /**
     * 본문이 제 안에서 구르는가.
     *
     * 비우면 기둥이 넘치는 만큼 구른다. `false` 는 안쪽이 제 스크롤을 갖는 자리에 준다.
     * 대화는 말이 쌓이는 칸만 구르고 말을 싣는 칸은 바닥에 붙어 있어야 한다.
     */
    readonly scroll?: boolean;

    readonly children: React.ReactNode;
    readonly className?: string;
}

export interface ChatRailProps
{
    readonly children: React.ReactNode;
    readonly className?: string;
}

export interface ChatSplitProps
{
    readonly pane: React.ReactNode;
    /** 오른쪽 칸. 비우면 손잡이도 칸도 서지 않고 기둥이 자리를 통째로 쓴다 */
    readonly side?: React.ReactNode;
    /** 오른쪽 칸의 처음 너비(px) */
    readonly defaultWidth?: number;
    readonly labels?: Partial<ChatShellLabels>;
    readonly className?: string;
}

export interface ChatShellLabels
{
    readonly newThread: string;
    readonly resize: string;
}

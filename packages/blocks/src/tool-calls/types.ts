import type React from "react";

/**
 * 도구 호출 하나의 처지.
 *
 * ⚠ **이 다섯은 블록의 어휘다.** 도메인의 값을 여기 적지 않는다. `packages/agents` 의
 *    `ToolCallStatus` 와 이름이 같은 것은 그 도메인이 이 짜임의 첫 소비처이기 때문이고,
 *    다른 도메인이 다른 이름을 쓰면 호출부가 이 다섯으로 옮겨 넘긴다.
 */
export type ToolCallStatus = "running" | "awaiting_approval" | "succeeded" | "rejected" | "failed";

export interface ToolCall
{
    readonly id: string;

    /** 부른 이름 그대로. 기계가 아는 이름이라 줄에서 눈에 먼저 띄어야 한다 */
    readonly name: string;

    /** 사람이 읽는 이름. 비우면 `name` 만 선다 */
    readonly label?: string;

    /**
     * 모델이 부르면서 적은 「무엇을 하려는가」 한 줄.
     *
     * ⚠ **줄의 제목이 이것이다.** 기계의 값(`readTask {"taskId":"1"}`)은 무엇을 한 줄인지 말해
     *    주지 않는다. 비우면 이름이 그 자리를 채우는데, 지난 실행에는 모델이 적은 값이 없다.
     */
    readonly intent?: string;

    readonly status: ToolCallStatus;

    /**
     * 넣어 부른 값.
     *
     * ⚠ **펴야 보인다.** 접힌 줄에 넣으면 한 줄에 값 둘이 겹쳐 무엇도 읽히지 않는다. 사람이
     *    「무엇을 넣고 불렀나」를 물을 때만 펴므로 그때 나오면 된다.
     */
    readonly input?: string;

    /**
     * 받은 값.
     *
     * ⚠ **펴야 보인다.** 접힌 줄이 드는 것은 무엇을 넣어 불렀나이고, 무엇이 돌아왔나는 편 사람만
     *    본다. 둘을 한 줄에 놓으면 긴 답이 넣은 값을 밀어내서 같은 줄이 호출마다 다른 것을 말한다.
     */
    readonly output?: string;

    /** 줄 앞의 아이콘. 종류를 가리는 일은 호출부가 한다 */
    readonly icon?: React.ReactNode;

    /**
     * 줄 아래 한 줄. 누가 언제 정했는지가 여기 선다.
     *
     * ⚠ **펴야 보인다.** 넣은 값과 같은 자리이고, 접힌 줄에 넣으면 한 줄에 값 둘이 겹친다.
     *
     * ⚠ **블록이 지어내지 않는다.** 「거절」인지 「승인」인지와 사람을 무엇으로 적을지는 도메인의
     *    어휘라, 블록은 받은 글을 그 자리에 놓기만 한다.
     */
    readonly note?: React.ReactNode;

    /**
     * 부를 때마다 사람이 답해야 하는 도구인가.
     *
     * 지나간 호출에 표가 붙어 「이것은 사람이 한 번 봤다」를 말한다. 지금 기다리는 중인지는
     * `status` 가 말하므로 이 칸은 그 축과 겹치지 않는다.
     */
    readonly gated?: boolean;
}

/**
 * 넣은 값과 결과를 줄 아래에 어떻게 두는가.
 *
 * ⚠ **`foldable` 이 기본이 아니다.** 여닫는 축을 줄마다 세우면 이미 접혀 있는 묶음 안에서 사람이 두 번
 *    펴야 한 줄을 본다. 레일처럼 바깥이 이미 접히는 자리는 `hidden` 이나 `shown` 으로 둔다.
 */
export type ToolCallDetail = "hidden" | "shown" | "foldable";

export interface ToolCallRowProps
{
    readonly call: ToolCall;
    readonly detail?: ToolCallDetail;
    readonly labels?: Partial<ToolCallsLabels>;
    readonly className?: string;
}

export interface ToolCallListProps
{
    readonly calls: ReadonlyArray<ToolCall>;
    readonly detail?: ToolCallDetail;
    readonly labels?: Partial<ToolCallsLabels>;
    readonly className?: string;
}

export interface ToolCallsProps
{
    readonly calls: ReadonlyArray<ToolCall>;

    /** 주면 제어 모드다. 여닫는 상태를 호출부가 갖는다 */
    readonly open?: boolean;

    /**
     * 비제어 모드의 처음 상태.
     *
     * ⚠ **비우면 블록이 정한다.** 멈춰 선 호출이 섞여 있으면 펴 둔다(`rules.ts` 의 `hasPending`).
     *    사람이 답해야 하는 자리를 접어 두면 그 답을 기다리는 줄 모른다.
     */
    readonly defaultOpen?: boolean;

    readonly onOpenChange?: (open: boolean) => void;
    readonly labels?: Partial<ToolCallsLabels>;
    readonly className?: string;
}

export interface ToolCallsLabels
{
    readonly running: string;
    readonly awaitingApproval: string;
    readonly succeeded: string;
    readonly rejected: string;
    readonly failed: string;
    /** 접힌 줄의 머리. 몇 번 불렀는지를 적는다 */
    readonly count: (count: number) => string;
    /** 사람이 답해야 하는 도구라는 표 */
    readonly gated: string;
    /** 펴 둔 줄의 왼쪽 이름표 둘 */
    readonly input: string;
    readonly output: string;
    readonly expand: string;
    readonly collapse: string;
}

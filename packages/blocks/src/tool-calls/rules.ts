import type { Tone } from "../tone";
import type { ToolCall, ToolCallStatus } from "./types";

/**
 * 도구 호출 묶음의 순수 규칙.
 *
 * 컴포넌트가 이 판정을 안고 있으면 「승인 대기가 섞이면 펴 둔다」를 확인하려고 매번 화면을 띄워야
 * 한다. 여기 있는 것은 전부 데이터만 보는 함수라 vitest 가 그대로 잰다.
 */

/**
 * 아직 끝나지 않은 처지인가.
 *
 * ⚠ **거절과 실패는 기다리는 것이 아니다.** 둘 다 끝난 것이고, 다만 끝난 모양이 다르다. 여기에
 *    넣으면 거절한 묶음이 영영 펴진 채로 남는다.
 */
export const isPending = (status: ToolCallStatus): boolean =>
    status === "running" || status === "awaiting_approval";

/** 묶음에 멈춰 선 것이 섞여 있는가. 비제어 모드의 처음 상태를 이것이 정한다 */
export const hasPending = (calls: ReadonlyArray<ToolCall>): boolean =>
    calls.some((call) => isPending(call.status));

/**
 * 여럿을 한 덩이로 묶는 상자를 세울 것인가.
 *
 * ⚠ **둘부터다.** 상자가 말하는 것은 「이 줄들이 한 덩이다」이고, 하나를 묶는 상자는 테두리만
 *    늘리고 말하는 것이 없다. 하나일 때는 흐린 줄 하나가 곧 그 호출이다.
 */
export const needsGroup = (calls: ReadonlyArray<ToolCall>): boolean => calls.length > 1;

/**
 * 처지의 색.
 *
 * ⚠ **블록이 갖는다.** `StatusBadge` 는 받은 tone 만 그리는데 그쪽 값은 도메인의 어휘라 대응표가
 *    온톨로지에 있다. 이 다섯은 이 블록이 정한 어휘이므로 대응도 여기 있는 것이 맞다.
 */
export const TOOL_CALL_TONE: Record<ToolCallStatus, Tone> = {
    running: "info",
    awaiting_approval: "warning",
    succeeded: "success",
    rejected: "danger",
    failed: "danger",
};

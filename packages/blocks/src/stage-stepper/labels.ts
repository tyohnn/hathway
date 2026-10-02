import type { StageStepperLabels } from "./types";

/**
 * 범례의 기본 문구.
 *
 * ⚠ optional 을 「외국환(옵션)」처럼 적지 않는다. 그것은 한 서비스의 곁가지 이름이라
 *    다른 서비스가 같은 블록을 쓰는 순간 틀린 말이 된다. 서비스에 매인 말은 호출부가 덮는다.
 */
export const STAGE_STEPPER_LABELS: StageStepperLabels = {
    done: "완료",
    current: "현재",
    optional: "옵션",
    hold: "홀딩",
    todo: "대기",
};

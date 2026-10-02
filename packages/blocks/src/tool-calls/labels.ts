import type { ToolCallsLabels } from "./types";

export const TOOL_CALLS_LABELS: ToolCallsLabels = {
    running: "실행 중",
    awaitingApproval: "승인 대기",
    succeeded: "완료",
    rejected: "거부",
    failed: "실패",
    count: (count) => `도구 ${count}번`,
    gated: "확인이 필요해요",
    input: "넣는 값",
    output: "결과",
    expand: "펼치기",
    collapse: "접기",
};

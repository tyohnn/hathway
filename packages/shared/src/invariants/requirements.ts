/**
 * 저장소 규약: 도메인이 없는 것들.
 *
 * 코드가 아니라 **만드는 방식**에 거는 규칙이라 어느 도메인에도 딸리지 않는다. id 에 도메인
 * 구간이 없는 것이 곧 그 신호다(`REQ-01`). 도메인 규칙은 그 도메인 패키지가 갖는다.
 *
 * 여섯 다 `enforcedAt` 이 「사람(리뷰)」이고 `review-only` 다. 기계가 막지 않으므로 인용하는
 * 테스트를 요구하지 않지만, 없는 id 를 인용하면 검사가 막는다.
 */

import type { Invariant } from "./types.ts";

export const REQUIREMENTS: readonly Invariant[] =
[
    {
        id: "REQ-01",
        statement: "알림을 다른 곳으로 옮길 때는 옮긴 쪽에 호출이 실제로 생겼는지를 확인한다.",
        rationale: "클라이언트의 알림 호출을 제거하며 서버로 옮겼다고 적었으나 실제로 옮긴 것은 절반이었고, 나머지는 일곱 달간 조용히 사라졌다.",
        kind: "요구",
        enforcedAt: "사람(리뷰)",
        status: "review-only",
        apps: [],
    },
    {
        id: "REQ-02",
        statement: "같은 판정을 하는 술어가 두 곳에 존재하지 않는다.",
        rationale: "같은 판정의 사본이 세 곳에 있었고 조건까지 달랐다. 앱과 에이전트와 MCP 가 같은 테이블을 읽는다.",
        kind: "요구",
        enforcedAt: "사람(리뷰)",
        status: "review-only",
        apps: ["web", "agent"],
    },
    {
        id: "REQ-03",
        statement: "코드의 허용 목록과 저장소 설정은 한 쌍으로 움직인다.",
        rationale: "어느 한쪽만 열면 화면은 받아 놓고 저장이 거절되는 무증상 구간이 생긴다.",
        kind: "요구",
        enforcedAt: "사람(리뷰)",
        status: "review-only",
        apps: [],
    },
    {
        id: "REQ-04",
        statement: "정상적인 거절과 예상 밖의 실패를 알림 등급에서 구분한다.",
        rationale: "섞으면 조치할 것 없는 알림이 쌓여 진짜 실패가 드러나지 않는다.",
        kind: "요구",
        enforcedAt: "사람(리뷰)",
        status: "review-only",
        apps: [],
    },
    {
        id: "REQ-05",
        statement: "같은 수치는 한 문서만 정본으로 두고 나머지는 그 문서를 가리킨다.",
        rationale: "화면 수와 라우트 수가 문서마다 갈렸고, 원인은 적혀 있지 않은 결번이었다.",
        kind: "요구",
        enforcedAt: "사람(리뷰)",
        status: "review-only",
        apps: [],
    },
    {
        id: "REQ-06",
        statement: "앱은 UX 경계이지 보안 경계가 아니다.",
        rationale: "이 앱이니까 여기서는 안전하다는 전제를 두지 않는다. 조회는 매번 행 단위로 판정한다.",
        kind: "요구",
        enforcedAt: "사람(리뷰)",
        status: "review-only",
        apps: ["web", "agent"],
    },
];

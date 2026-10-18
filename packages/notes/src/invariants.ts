/**
 * 예시 도메인 `notes` 의 불변식.
 *
 * 쪽지 하나를 누가 보고 누가 고치는지에 걸리는 규칙이 여기 온다. 인용 표기는 `INV-NOTE-` 로 시작하는
 * 두 자리 번호다. 검사 스크립트가 이 파일에 남의 도메인 id 가 들어오는 것을 막는다.
 *
 * ⚠ 새 제품에서 이 도메인을 지우면 `packages/shared/scripts/check-invariants.mjs` 의 카탈로그 목록에서도
 *    이 줄을 뺀다. 도메인을 새로 세우면 같은 모양의 파일을 그 패키지에 두고 목록에 줄을 더한다.
 */

import type { Invariant } from "@hathway/shared/invariants/types";

export const INVARIANTS: readonly Invariant[] = [
    {
        id: "INV-NOTE-01",
        statement: "쪽지는 같은 테넌트의 사람에게만 보이고, 비공개 쪽지는 쓴 사람에게만 보인다.",
        rationale:
            "모든 요청이 앱마다 하나인 롤로 나가므로 데이터베이스는 이 질의가 누구의 것인지 모른다. "
            + "행 단위 판정이 이 술어 하나에 있어야 화면과 에이전트의 도구가 같은 답을 낸다.",
        kind: "앱",
        enforcedAt: "도메인 함수",
        status: "enforced",
        apps: ["web", "agent"],
    },
    {
        id: "INV-NOTE-02",
        statement: "볼 수 없는 쪽지는 거부가 아니라 부재로 답한다.",
        rationale: "「볼 수 없다」고 답하면 그 행이 있다는 사실 자체가 새어 나간다.",
        kind: "앱",
        enforcedAt: "도메인 함수",
        status: "enforced",
        apps: ["web", "agent"],
    },
    {
        id: "INV-NOTE-03",
        statement: "쪽지를 보관하는 것은 쓴 사람뿐이고, 열었을 때의 판이 지금의 판과 같아야 한다.",
        rationale:
            "같은 테넌트라서 보인다는 것과 고칠 수 있다는 것은 다른 물음이다. 판을 대조하지 않으면 "
            + "사람이 보지 못한 변경을 덮어쓴다.",
        kind: "앱",
        enforcedAt: "도메인 함수",
        status: "enforced",
        apps: ["web"],
    },
    {
        id: "INV-NOTE-04",
        statement: "보관한 쪽지는 되살리지 않는다. 보관은 한 방향이다.",
        rationale: "되돌리는 길이 생기면 보관이 삭제처럼 쓰여 기록의 뜻이 흐려진다. 되살릴 일이면 새로 쓴다.",
        kind: "데이터",
        enforcedAt: "DB 트리거",
        status: "enforced",
        apps: ["web"],
    },
];

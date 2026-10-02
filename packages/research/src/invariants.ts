/**
 * 리서치 보드의 불변식. 인용 표기는 `INV-RESEARCH-` 로 시작하는 두 자리 번호다.
 */

import type { Invariant } from "@investment/shared/invariants/types";

export const INVARIANTS: readonly Invariant[] = [
    {
        id: "INV-RESEARCH-01",
        statement: "보드는 로그인하지 않아도 보인다.",
        rationale: "교재와 분석 화면처럼 읽기는 공개다(2026-10-02 사용자 결정). 가려야 할 보드가 생기면 읽는 술어를 먼저 세운다.",
        kind: "앱",
        enforcedAt: "도메인 함수",
        status: "enforced",
        apps: ["web"],
    },
    {
        id: "INV-RESEARCH-02",
        statement: "보드를 고치고 지우는 것은 그 보드를 가진 테넌트의 구성원뿐이고, 역할을 가리지 않는다.",
        rationale:
            "모든 요청이 앱의 롤 하나로 나가므로 데이터베이스는 이 쓰기가 누구의 것인지 모른다. "
            + "판정이 이 술어 하나에 있고 쓰는 문장이 테넌트를 조건으로 한 번 더 건다.",
        kind: "앱",
        enforcedAt: "도메인 함수",
        status: "enforced",
        apps: ["web"],
    },
    {
        id: "INV-RESEARCH-03",
        statement: "저장은 열었을 때의 판이 지금의 판과 같을 때만 쓴다.",
        rationale: "판을 대조하지 않으면 다른 사람이 그사이 고친 것을 보지 못한 채 덮어쓴다.",
        kind: "앱",
        enforcedAt: "도메인 함수",
        status: "enforced",
        apps: ["web"],
    },
    {
        id: "INV-RESEARCH-04",
        statement: "새 보드의 테넌트와 만든 사람은 행위자에게서 오고 slug 는 서버가 짓는다.",
        rationale: "입력이 그 칸을 고를 수 있으면 남의 테넌트에 보드를 세우거나 남의 slug 를 덮는 길이 된다.",
        kind: "앱",
        enforcedAt: "도메인 함수",
        status: "enforced",
        apps: ["web"],
    },
    {
        id: "INV-RESEARCH-05",
        statement: "보드의 문서는 정해진 모양과 한도 안에 있을 때만 저장한다. 링크는 http(s) 와 / 로 시작하는 것만 받는다.",
        rationale:
            "본문이 jsonb 칸 하나라 데이터베이스가 그 안을 막지 못한다. 모양이 틀린 문서는 화면을 통째로 깨뜨리고, "
            + "한도가 없으면 보드 하나가 문서 칸을 끝없이 키우며, 화면은 링크를 그대로 href 에 넣는다.",
        kind: "데이터",
        enforcedAt: "입력 검증",
        status: "enforced",
        apps: ["web"],
    },
];

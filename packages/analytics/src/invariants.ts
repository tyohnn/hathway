/**
 * `analytics` 도메인의 불변식.
 *
 * 무엇을 제품 분석으로 내보내도 되는지에 걸리는 규칙이 여기 온다. 인용 표기는 `INV-ANALYTICS-` 로 시작하는 두 자리 번호다.
 */

import type { Invariant } from "@hathway/shared/invariants/types";

export const INVARIANTS: readonly Invariant[] = [
    {
        id: "INV-ANALYTICS-01",
        statement: "동의하지 않은 사람의 이벤트는 서버에서도 보내지 않는다. 아직 고르지 않은 사람도 동의하지 않은 사람이다.",
        rationale:
            "브라우저는 쿠키 없는 모드(`cookieless_mode: \"on_reject\"`)라 고르기 전에는 아무것도 적지 않는다. 서버가 계정 id 로 "
            + "따로 보내면 그 약속이 서버에서 깨진다(2026-09-30 사용자 결정). MCP 처럼 동의를 물을 수 없는 길은 보내지 않는 쪽이다.",
        kind: "앱",
        enforcedAt: "도메인 함수",
        status: "enforced",
        apps: ["web"],
    },
    {
        id: "INV-ANALYTICS-02",
        statement: "사람은 계정 id 로만 가리킨다. 이메일과 이름을 보내지 않는다.",
        rationale:
            "분석 도구는 우리 DB 밖이고 지우기가 어렵다. 계정 id 만 가면 계정을 지울 때 우리 쪽에서 끊긴다. 이메일이 필요한 "
            + "Messaging 은 이 규칙과 부딪혀서 미뤘다(2026-09-30 사용자 결정).",
        kind: "앱",
        enforcedAt: "도메인 함수",
        status: "enforced",
        apps: ["web"],
    },
    {
        id: "INV-ANALYTICS-03",
        statement: "이벤트는 카탈로그에 있는 것만 가고, 속성은 카탈로그가 그 이벤트에 적은 키만 간다.",
        rationale:
            "속성을 열어 두면 언젠가 쪽지 제목이나 본문이 딸려 간다. 허용 목록이면 새는 길이 카탈로그를 고치는 커밋 하나로 "
            + "좁아지고 리뷰에 걸린다.",
        kind: "앱",
        enforcedAt: "도메인 함수",
        status: "enforced",
        apps: ["web"],
    },
    {
        id: "INV-ANALYTICS-04",
        statement: "LLM 호출의 입력과 출력은 보내지 않는다. 모델 · 토큰 · 걸린 시간만 간다.",
        rationale: "입력은 쪽지 본문이다. 분석에 필요한 것은 비용과 지연이고 내용이 아니다(2026-09-30 사용자 결정).",
        kind: "앱",
        enforcedAt: "도메인 함수",
        status: "planned",
        apps: ["web", "agent"],
    },
];

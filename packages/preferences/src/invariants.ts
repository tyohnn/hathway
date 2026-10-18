/**
 * `preferences` 도메인의 불변식.
 *
 * 사람이 고른 설정을 누가 읽고 무엇으로 고칠 수 있는지에 걸리는 규칙이 여기 온다. 인용 표기는 `INV-PREFERENCE-` 로
 * 시작하는 두 자리 번호다.
 */

import type { Invariant } from "@hathway/shared/invariants/types";

export const INVARIANTS: readonly Invariant[] = [
    {
        id: "INV-PREFERENCE-01",
        statement: "설정은 그 사람이 그 조직에서 고른 것이고, 자기 것만 읽고 쓴다.",
        rationale:
            "설정을 고치는 것은 밖에서 붙은 도우미가 부르는 도구다. 도구의 인자로 계정을 받으면 모델이 그 값을 지어내고, "
            + "모든 요청이 앱마다 하나인 롤로 나가므로 데이터베이스는 그것을 막아 주지 못한다. 그래서 포트가 행위자만 받는다.",
        kind: "앱",
        enforcedAt: "서버 경로",
        status: "enforced",
        apps: ["web"],
    },
    {
        id: "INV-PREFERENCE-02",
        statement: "모르는 칸과 어휘 밖의 값은 고치지 않는다. 하나라도 틀리면 통째로 받지 않는다.",
        rationale:
            "설정 화면은 우리가 그리지 않는다. 호스트가 보내는 묶음은 밖에서 온 입력이고, 맞는 칸만 골라 고치면 사람은 "
            + "저장했다고 믿는데 반만 남는다.",
        kind: "앱",
        enforcedAt: "도메인 함수",
        status: "enforced",
        apps: ["web"],
    },
    {
        id: "INV-PREFERENCE-03",
        statement: "한 사람이 한 조직에서 갖는 설정은 한 줄이다.",
        rationale: "줄이 둘이면 읽을 때마다 다른 값이 나온다. 설정 화면이 칸마다 따로 저장하므로 동시에 오는 쓰기가 흔하다.",
        kind: "데이터",
        enforcedAt: "유일 인덱스",
        status: "enforced",
        apps: ["web"],
    },
];

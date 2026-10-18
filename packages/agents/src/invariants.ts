/**
 * `agent` 도메인의 불변식.
 *
 * 에이전트와 나눈 대화가 누구에게 보이고 어떻게 쌓이는지에 걸리는 규칙이 여기 온다. 인용 표기는
 * `INV-AGENT-` 로 시작하는 두 자리 번호다.
 */

import type { Invariant } from "@hathway/shared/invariants/types";

export const INVARIANTS: readonly Invariant[] = [
    {
        id: "INV-AGENT-01",
        statement: "대화는 그 대화를 연 사람만 다시 열고 이어 말한다.",
        rationale:
            "대화의 주소는 워크플로의 실행 번호라서 주소를 아는 사람은 누구나 그 번호를 적을 수 있다. "
            + "번호만으로 열리면 남의 대화를 읽고 그 사람의 눈으로 도는 에이전트에 말을 싣는다.",
        kind: "앱",
        enforcedAt: "도메인 함수",
        status: "enforced",
        apps: ["agent"],
    },
    {
        id: "INV-AGENT-02",
        statement: "대화의 말은 쌓이기만 한다. 고치거나 지우는 길이 없다.",
        rationale: "기록이 바뀔 수 있으면 에이전트가 무엇을 듣고 무엇을 했는지를 나중에 답하지 못한다.",
        kind: "데이터",
        enforcedAt: "DB 트리거",
        status: "enforced",
        apps: ["agent"],
    },
    {
        id: "INV-AGENT-03",
        statement: "같은 말을 두 번 적어도 장부에는 한 줄이다.",
        rationale:
            "워크플로의 스텝은 실패하면 다시 돈다. 다시 돈 스텝이 줄을 또 적으면 대화가 두 번 말한 것처럼 선다.",
        kind: "데이터",
        enforcedAt: "유일 인덱스",
        status: "enforced",
        apps: ["agent"],
    },
    {
        id: "INV-AGENT-04",
        statement: "워크플로는 행위자를 나르지 않는다. 도구가 도는 순간 계정 id 로 행위자를 다시 세운다.",
        rationale:
            "워크플로의 인자는 직렬화를 지나 저장되고 며칠 뒤에 다시 읽힌다. 행위자에는 증거 구실을 하는 "
            + "데이터가 없어서 그 왕복을 지나면 역할을 적어 넣은 객체와 구분되지 않고, 저장된 소속은 깨어나는 "
            + "그때의 소속도 아니다.",
        kind: "앱",
        enforcedAt: "서버 경로",
        status: "enforced",
        apps: ["agent"],
    },
];

/**
 * 관문(`appAction`)이 「행위자가 없다」로 끊은 요청인가.
 *
 * 이 앱은 읽기가 공개라 로그인하지 않은 사람도 쓰는 단추가 있는 화면에 닿을 수 있다(세션이 끝난 탭 등).
 * 액션은 그 거절을 글로 돌려줘야 하는데, 다른 실패(틀린 입력 · DB 장애)까지 「로그인하세요」로 답하면 안 된다.
 */
export const isGateRefusal = (cause: unknown): boolean =>
    /"_tag":"(NoSession|NotAppMember)"/.test(JSON.stringify(cause, Object.getOwnPropertyNames(Object(cause))));

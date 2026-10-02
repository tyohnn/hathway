/**
 * 관문(`appAction`)을 지나다 끊긴 요청이 왜 끊겼는가.
 *
 * 이 앱은 읽기가 공개라 로그인하지 않은 사람도 쓰는 단추가 있는 화면에 닿을 수 있다(세션이 끝난 탭 등). 액션은 그
 * 거절을 글로 돌려줘야 하는데, 까닭마다 사람이 할 일이 다르다.
 *
 * - `sign-in`: 행위자가 없다. 로그인하면 된다.
 * - `invalid`: 입력의 꼴이 틀렸다. 화면에서는 나올 수 없는 입력이라 무엇이 틀렸는지 알려 주지 않는다.
 * - `failed`: 그 밖의 실패(DB 장애 등). 원문에는 표와 제약의 이름이 실리므로 화면에 싣지 않고 기록에만 남긴다.
 */
export type Refusal = "sign-in" | "invalid" | "failed";

const tagIn = (cause: unknown, tags: string): boolean =>
    new RegExp(`"_tag":"(${tags})"`).test(JSON.stringify(cause, Object.getOwnPropertyNames(Object(cause))));

export const isGateRefusal = (cause: unknown): boolean => tagIn(cause, "NoSession|NotAppMember");

export const refusalOf = (cause: unknown): Refusal =>
{
    if (isGateRefusal(cause)) return "sign-in";

    return tagIn(cause, "InvalidActionInput") ? "invalid" : "failed";
};

export const REFUSAL_MESSAGES: Record<Refusal, string> = {
    "sign-in": "로그인한 뒤에 할 수 있어요.",
    invalid: "요청을 처리하지 못했어요. 새로 고친 뒤 다시 해 주세요.",
    failed: "지금은 처리하지 못했어요. 잠시 뒤 다시 해 주세요.",
};

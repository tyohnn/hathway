/**
 * 대화를 보내다 실패했을 때 화면에 세울 말.
 *
 * 전송(`WorkflowChatTransport`)은 실패하면 `Failed to fetch chat: <상태> <본문>` 모양의 오류를 던진다. 상태마다 사람이 할
 * 일이 달라서 한 문장으로 접지 않는다. 너무 긴 글을 다시 보내라고 하면 같은 결과가 되풀이된다.
 *
 * ⚠ **422 의 본문만 그대로 보인다.** 그 본문은 우리가 사람에게 보이려고 쓴 말이다(`usecases/conversation.ts` 의
 *    `sayVerdict`). 다른 상태의 본문은 서버의 말이라 싣지 않는다.
 */
export const FALLBACK = "답을 받지 못했어요. 다시 보내 주세요.";

export const chatErrorText = (error: Error | undefined): string | null =>
{
    if (error === undefined)
    {
        return null;
    }

    const match = /Failed to fetch chat: (\d{3}) ?([\s\S]*)$/.exec(error.message);
    const status = match === null ? null : Number(match[1]);
    const body = match?.[2]?.trim() ?? "";

    switch (status)
    {
        case 422:
            return body === "" ? FALLBACK : body;
        case 401:
            return "다시 로그인해 주세요.";
        case 404:
            return "대화를 찾을 수 없어요.";
        case 409:
            return "종료된 대화예요. 새 대화를 시작해 주세요.";
        default:
            return FALLBACK;
    }
};

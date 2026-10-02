export interface ConversationLabels
{
    /** 멈춰 선 도구를 승인하는 단추 */
    readonly approve: string;
    readonly reject: string;
    /** 단추 옆 한 줄. 거부가 사라지는 일이 아니라는 것을 밝힌다 */
    readonly rejectNote: string;
    /** 말이 쌓이는 칸의 이름. 화면 읽기 도구가 그 칸을 이것으로 부른다 */
    readonly transcript: string;
    /** 맨 아래로 돌아가는 단추. 눈에는 화살표만 보인다 */
    readonly scrollToEnd: string;
}

export const CONVERSATION_LABELS: ConversationLabels = {
    approve: "승인하고 이어서",
    reject: "거부",
    rejectNote: "거절한 것도 대화에 남아요",
    transcript: "대화",
    scrollToEnd: "맨 아래로",
};

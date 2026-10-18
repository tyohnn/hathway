import type { LanguageModelV4, LanguageModelV4CallOptions, LanguageModelV4GenerateResult } from "@ai-sdk/provider";

/**
 * 요약이 쓸 모델. `SUMMARY_RUNNER=rehearsal` 이면 부르지 않고 정해진 답을 내는 연습 모델이고, 아니면 AI Gateway 의 모델
 * id 다(`SUMMARY_MODEL`, 기본은 agent 와 같다). 게이트웨이 키가 없는 로컬과 e2e 가 연습 모델로 돈다.
 *
 * ⚠ **연습 모델은 토큰 300개를 썼다고 답한다.** 크레딧 장부가 실물과 같은 길로 돌고, 검사가 2 크레딧을 단언할 수 있다.
 * ⚠ **시각과 난수를 쓰지 않는다.** 같은 쪽지에 같은 답을 내야 e2e 가 화면을 단언할 수 있다.
 */
export const DEFAULT_SUMMARY_MODEL = "anthropic/claude-sonnet-5.5";

const REHEARSAL_TOKENS = 300;

/** 프롬프트의 마지막 사람 말. 요약은 「제목\n내용」을 한 덩이로 싣는다 */
const lastUserText = (options: LanguageModelV4CallOptions): string =>
{
    for (const message of [...options.prompt].reverse())
    {
        if (message.role === "user")
        {
            return message.content.map((part) => (part.type === "text" ? part.text : "")).join("").trim();
        }
    }

    return "";
};

export class RehearsalSummaryModel implements LanguageModelV4
{
    readonly specificationVersion = "v4";
    readonly provider = "rehearsal";
    readonly modelId = "rehearsal-summary";
    readonly supportedUrls = {};

    async doGenerate(options: LanguageModelV4CallOptions): Promise<LanguageModelV4GenerateResult>
    {
        const [title = "", ...body] = lastUserText(options).split("\n");
        const first = body.find((line) => line.trim() !== "")?.trim() ?? "내용 없음";

        return {
            content: [{ type: "text", text: `(연습 모드) ${title.trim()}: ${first}` }], // ux-writing: 개발과 e2e 에서만 서는 답이다
            finishReason: { unified: "stop", raw: undefined },
            usage: {
                inputTokens: { total: REHEARSAL_TOKENS - 20, noCache: REHEARSAL_TOKENS - 20, cacheRead: 0, cacheWrite: 0 },
                outputTokens: { total: 20, text: 20, reasoning: 0 },
            },
            warnings: [],
        };
    }

    async doStream(): Promise<never>
    {
        throw new Error("연습 요약 모델은 스트림으로 답하지 않는다");
    }
}

export const chosenSummaryModel = (env: Record<string, string | undefined> = process.env): LanguageModelV4 | string =>
{
    if (env["SUMMARY_RUNNER"] === "rehearsal")
    {
        return new RehearsalSummaryModel();
    }

    const model = env["SUMMARY_MODEL"]?.trim();

    return model === undefined || model === "" ? DEFAULT_SUMMARY_MODEL : model;
};

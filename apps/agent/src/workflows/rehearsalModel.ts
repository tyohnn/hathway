import type { LanguageModelV4, LanguageModelV4CallOptions, LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { WORKFLOW_DESERIALIZE, WORKFLOW_SERIALIZE } from "@workflow/serde";

/**
 * 모델을 부르지 않고 정해진 답을 내는 연습용 모델(`AGENT_RUNNER=rehearsal`).
 *
 * 게이트웨이 키가 없는 로컬과 e2e 가 쓴다. **워크플로와 스텝과 도구와 장부는 실물과 같은 길로 돈다.**
 * 바뀌는 것은 모델 호출 한 자리뿐이다. 그래서 e2e 가 이 모델로도 내구성 있는 실행의 배선을 끝까지 잰다.
 *
 * 답하는 규칙은 셋이다.
 *
 *   1. 방금 도구의 답을 받았으면 그 답을 한 줄로 옮긴다
 *   2. 사람의 말에 「쪽지」가 있으면 `list_my_notes` 를 부른다
 *   3. 그 밖에는 받은 말을 되받아 적는다
 *
 * ⚠ **워크플로 자리를 지나 스텝으로 넘어간다.** 모델은 워크플로의 인자로 실려 모델 호출 스텝에 넘겨지므로
 *    직렬화를 지나야 한다. 그 모양을 `WORKFLOW_SERIALIZE` · `WORKFLOW_DESERIALIZE` 가 정한다. 담을 상태가
 *    없어서 이름 하나만 싣는다.
 * ⚠ **시각과 난수를 쓰지 않는다.** 같은 말에 같은 답을 내야 e2e 가 화면을 단언할 수 있다.
 */
export const REHEARSAL_MODEL_ID = "rehearsal";

const usage = {
    inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 0, text: 0, reasoning: 0 },
};

type Prompt = LanguageModelV4CallOptions["prompt"];

/** 마지막 메시지가 도구의 답이면 그 값을 글로 돌려준다 */
const lastToolResult = (prompt: Prompt): string | null =>
{
    const last = prompt.at(-1);

    if (last === undefined || last.role !== "tool")
    {
        return null;
    }

    for (const part of last.content)
    {
        if (part.type === "tool-result")
        {
            const output = part.output;

            if (output.type === "text" || output.type === "error-text")
            {
                return output.value;
            }

            return output.type === "json" || output.type === "error-json" ? JSON.stringify(output.value) : output.type;
        }
    }

    return null;
};

/** 마지막 사람의 말 */
const lastUserText = (prompt: Prompt): string =>
{
    for (const message of [...prompt].reverse())
    {
        if (message.role === "user")
        {
            return message.content
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("")
                .trim();
        }
    }

    return "";
};

/** 이번 호출이 스트림에 실을 조각들 */
export const rehearsalParts = (prompt: Prompt): ReadonlyArray<LanguageModelV4StreamPart> =>
{
    const toolResult = lastToolResult(prompt);
    const said = lastUserText(prompt);

    if (toolResult === null && said.includes("쪽지"))
    {
        return [
            { type: "stream-start", warnings: [] },
            { type: "tool-call", toolCallId: `rehearsal-${prompt.length}`, toolName: "list_my_notes", input: "{}" },
            { type: "finish", usage, finishReason: { unified: "tool-calls", raw: undefined } },
        ];
    }

    const text = toolResult === null
        ? `(연습 모드) 「${said}」 잘 받았어요.` // ux-writing: 개발과 e2e 에서만 서는 답이라 연습 모드임을 밝힌다
        : toolResult;

    return [
        { type: "stream-start", warnings: [] },
        { type: "text-start", id: "t" },
        { type: "text-delta", id: "t", delta: text },
        { type: "text-end", id: "t" },
        { type: "finish", usage, finishReason: { unified: "stop", raw: undefined } },
    ];
};

export class RehearsalModel implements LanguageModelV4
{
    readonly specificationVersion = "v4";
    readonly provider = "rehearsal";
    readonly modelId = REHEARSAL_MODEL_ID;
    readonly supportedUrls = {};

    static [WORKFLOW_SERIALIZE](_instance: RehearsalModel): { readonly modelId: string }
    {
        return { modelId: REHEARSAL_MODEL_ID };
    }

    static [WORKFLOW_DESERIALIZE](_data: { readonly modelId: string }): RehearsalModel
    {
        return new RehearsalModel();
    }

    async doGenerate(): Promise<never>
    {
        throw new Error("연습 모델은 스트림으로만 답한다");
    }

    async doStream(options: LanguageModelV4CallOptions): Promise<{ stream: ReadableStream<LanguageModelV4StreamPart> }>
    {
        const parts = rehearsalParts(options.prompt);

        return {
            stream: new ReadableStream<LanguageModelV4StreamPart>({
                start(controller)
                {
                    for (const part of parts)
                    {
                        controller.enqueue(part);
                    }

                    controller.close();
                },
            }),
        };
    }
}

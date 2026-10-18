import { WorkflowAgent, type ModelCallStreamPart } from "@ai-sdk/workflow";
import { jsonSchema, stepCountIs, type ModelMessage } from "ai";
import { getWorkflowMetadata, getWritable } from "workflow";

import { chatMessageHook } from "./hooks/chatMessage";
import { MODEL_CALL_PROVIDER_OPTIONS } from "./modelCallOptions";
import { RehearsalModel, REHEARSAL_MODEL_ID } from "./rehearsalModel";
import { appendMessageStep, closeConversationStep, openConversationStep } from "./steps/ledger";
import { listNotesStep } from "./steps/listNotes";

/**
 * 에이전트와 나누는 대화 하나를 도는 워크플로. **실행 하나가 대화 하나다.**
 *
 * Workflow 문서의 multi-turn 모양을 따른다. 첫 말로 실행이 서고, 턴 사이에는 훅을 기다리며 컴퓨트를 쓰지
 * 않는다. 사람이 다음 말을 걸면 `/api/chat/[runId]` 가 훅을 깨운다. 실행 번호가 곧 대화의 주소다.
 *
 * ⚠ **이 함수가 나르는 것은 데이터뿐이다**(INV-AGENT-04). 워크플로의 인자는 직렬화를 지나 저장되고 며칠
 *    뒤에 다시 읽힌다. 행위자도 DB 연결도 실을 수 없어서 계정 id 하나를 싣고 도구가 도는 스텝이 그
 *    순간에 행위자를 다시 세운다(`steps/listNotes.ts`).
 * ⚠ **턴마다 `finish` 를 보낸다.** 화면의 전송(`WorkflowChatTransport`)은 `finish` 를 받아야 그 응답을
 *    끝낸 것으로 본다. 스트림은 닫지 않아서(`preventClose`) 다음 턴이 같은 스트림에 이어 쓴다. 턴이 어디서
 *    시작하는지는 이어 말하는 라우트가 스트림의 끝 번호로 잰다(`app/api/chat/[runId]/route.ts`).
 * ⚠ **사람의 말은 스트림에 실리지 않는다.** 훅으로 들어온 말은 모델의 출력이 아니라서 스트림이 담지 않는다.
 *    사람이 다시 열어 볼 대화는 장부(`agent.message`)가 들고, 적는 일은 전부 이 워크플로의 스텝이 한다.
 * ⚠ **워크플로 자리에서 시각 · 난수 · 환경 변수를 읽지 않는다.** 재생이 같은 차례를 다시 세워야 하므로
 *    그런 값은 인자나 스텝으로 들어온다. 어느 모델을 쓸지도 실행을 건 라우트가 정해 넘긴다.
 */
export interface ChatInput
{
    /** 이 대화를 연 사람의 계정 id. 도구가 그 사람의 눈으로 돈다 */
    readonly accountId: string;
    /** 이 대화를 연 테넌트. 장부의 줄에 적을 사실이고 판정의 입력이 아니다 */
    readonly tenantId: string;
    /** 첫 말을 장부에 적을 이름. 화면이 붙인 메시지 id 에서 온다(INV-AGENT-03) */
    readonly messageKey: string;
    /** 게이트웨이의 모델 이름이거나 연습 모델(`rehearsal`)이다 */
    readonly model: string;
    readonly prompt: string;
}

/** 한 턴이 도는 걸음의 한도. 잘못 세운 에이전트가 같은 도구를 끝없이 부르며 토큰을 태우는 것을 막는다 */
const MAX_STEPS = 20;

/** 한 대화가 받는 턴의 한도. 이만큼 주고받으면 실행이 닫히고 사람은 새 대화를 연다 */
export const MAX_TURNS = 50;

const INSTRUCTIONS = [
    "너는 이 제품의 운영팀을 돕는 에이전트다.",
    "쪽지에 대해 물으면 list_my_notes 도구로 이 사람이 볼 수 있는 쪽지를 읽고 답한다.",
    "도구가 돌려주지 않은 쪽지를 지어내지 않는다. 한국어로 짧게 답한다.",
].join(" ");

/**
 * 다음 턴에 싣고 갈 대화. 지시문(시스템 메시지)은 걸러 낸다.
 *
 * ⚠ **턴의 결과에는 지시문이 함께 온다.** 그대로 다음 턴에 실으면 `WorkflowAgent` 가 「시스템 메시지는
 *    instructions 로 넘기라」며 거절하고, 사람이 둘째 말을 거는 순간 대화가 실패로 닫힌다(스캐폴드를 세우며 실측).
 */
export const carried = (messages: ReadonlyArray<ModelMessage>): Array<ModelMessage> =>
    messages.filter((message) => message.role !== "system");

export async function chat(input: ChatInput): Promise<void>
{
    "use workflow";

    const { workflowRunId } = getWorkflowMetadata();
    const writable = getWritable<ModelCallStreamPart>();
    const hook = chatMessageHook.create({ token: workflowRunId });

    const agent = new WorkflowAgent({
        model: input.model === REHEARSAL_MODEL_ID ? new RehearsalModel() : input.model,
        instructions: INSTRUCTIONS,
        stopWhen: stepCountIs(MAX_STEPS),
        providerOptions: MODEL_CALL_PROVIDER_OPTIONS,
        tools: {
            list_my_notes: {
                description: "이 대화를 연 사람이 볼 수 있는 쪽지의 제목을 읽는다.",
                inputSchema: jsonSchema<Record<string, never>>({ type: "object", properties: {}, additionalProperties: false }),
                execute: async () => await listNotesStep({ accountId: input.accountId }),
            },
        },
    });

    // ⚠ **장부의 줄은 워크플로가 연다.** 실행을 건 라우트가 열면 그 요청과 첫 턴이 경주하고, 첫 턴이 먼저
    //    끝나면 줄이 없는 대화에 말을 적으려다 외래 키에 걸린다
    await openConversationStep({
        conversationId: workflowRunId,
        tenantId: input.tenantId,
        startedBy: input.accountId,
        prompt: input.prompt,
        messageKey: input.messageKey,
    });

    let messages: Array<ModelMessage> = [{ role: "user", content: input.prompt }];

    try
    {
        for (let turn = 0; turn < MAX_TURNS; turn += 1)
        {
            const result = await agent.stream({ messages, writable, preventClose: true, sendFinish: true });

            messages = carried(result.messages);

            await appendMessageStep({
                conversationId: workflowRunId,
                key: `turn-${turn}-assistant`,
                role: "assistant",
                text: result.steps.map((step) => step.text).join("").trim(),
            });

            // 마지막 턴에서는 받아도 돌릴 자리가 없다. 받아 두고 버리면 사람은 답을 기다린다
            if (turn === MAX_TURNS - 1)
            {
                break;
            }

            const { key, text } = await hook;

            await appendMessageStep({ conversationId: workflowRunId, key, role: "user", text });

            messages = [...messages, { role: "user", content: text }];
        }
    }
    finally
    {
        await closeConversationStep({ conversationId: workflowRunId });
    }
}

import { createModelCallToUIChunkTransform } from "@ai-sdk/workflow";
import { createUIMessageStreamResponse } from "ai";
import { Schema } from "effect";
import { start } from "workflow/api";

import { currentActor } from "@/lib/currentActor";
import { untilTurnEnd } from "@/lib/turnStream";
import { chosenModel } from "@/lib/model";
import { SayInput, sayVerdict } from "@/usecases/conversation";
import { chat } from "@/workflows/chat";

/**
 * 첫 말로 대화를 연다. 실행 하나가 대화 하나이고, 이 요청이 그 실행을 건다.
 *
 * ⚠ **라우트 핸들러도 공개 엔드포인트다.** 서버 액션의 관문과 같은 순서를 손으로 지난다. 스트림을 돌려줘야
 *    해서 서버 액션으로 둘 수 없다. ① 입력을 Schema 로 파싱하고 ② 행위자를 세운 뒤에야 실행을 건다.
 * ⚠ **실행에 싣는 것은 계정 id 와 테넌트 id 다**(INV-AGENT-04). 행위자를 싣지 않는다.
 * ⚠ **응답은 첫 턴의 스트림이다.** 워크플로가 턴마다 `finish` 를 보내므로 화면의 전송은 첫 턴이 끝나면
 *    이 응답을 닫는다. 턴이 시작하는 스트림 번호를 `x-turn-start` 로 알려 재접속이 그 자리에서 잇게 한다.
 */
const decode = Schema.decodeUnknownOption(SayInput);

export async function POST(request: Request): Promise<Response>
{
    const parsed = decode(await request.json().catch(() => null));

    if (parsed._tag === "None")
    {
        return new Response("입력을 확인해 주세요", { status: 400 });
    }

    const actor = await currentActor();

    if (actor === null)
    {
        return new Response("로그인이 필요해요", { status: 401 });
    }

    const verdict = sayVerdict(parsed.value);

    if (verdict._tag === "Rejected")
    {
        return new Response(verdict.message, { status: 422 });
    }

    const run = await start(chat, [{
        accountId: actor.accountId,
        tenantId: actor.tenantId,
        messageKey: verdict.key,
        model: chosenModel(),
        prompt: verdict.text,
    }]);

    return createUIMessageStreamResponse({
        stream: run.readable.pipeThrough(untilTurnEnd()).pipeThrough(createModelCallToUIChunkTransform()),
        headers: { "x-workflow-run-id": run.runId, "x-turn-start": "0" },
    });
}

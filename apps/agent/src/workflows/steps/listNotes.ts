import "server-only";

import { Effect } from "effect";

import { NoteStore } from "@hathway/notes/ports/NoteStore";

import { noteStoreLayer } from "@/lib/agentRuntime";
import { actorForAccountId } from "@/lib/auth";

/**
 * 에이전트의 도구 `list_my_notes` 가 도는 스텝. **도구가 도메인 데이터에 닿는 본보기다.**
 *
 * ⚠ **행위자를 인자로 받지 않고 이 자리에서 다시 세운다**(INV-AGENT-04). 워크플로가 나르는 것은 계정 id
 *    하나이고, 그사이 그 사람이 나갔거나 멤버십이 끊겼으면 여기서 막힌다.
 * ⚠ **화면과 같은 술어를 지난다**(INV-NOTE-01). 저장소의 읽는 메서드가 행위자를 받아 볼 수 있는 것만
 *    돌려준다. 도구라고 해서 더 보지 않는다. 인자로 테넌트나 계정을 받지 않는 것도 같은 까닭이다. 모델이
 *    그 값을 지어낸다.
 * ⚠ **막힌 것을 오류로 던지지 않는다.** 던지면 대화가 통째로 닫혀 사람이 까닭을 보지 못한다. 까닭을
 *    도구의 답으로 돌려주면 에이전트가 그것을 읽고 사람에게 옮긴다.
 */
export async function listNotesStep(input: { readonly accountId: string }): Promise<string>
{
    "use step";

    const listed = Effect.gen(function*()
    {
        const actor = yield* actorForAccountId(input.accountId);
        const layer = yield* noteStoreLayer;
        const notes = yield* Effect.flatMap(NoteStore, (store) => store.listVisible(actor)).pipe(Effect.provide(layer));
        const active = notes.filter((note) => note.status === "active");

        return active.length === 0
            ? "볼 수 있는 쪽지가 없어요."
            : `쪽지 ${active.length}개: ${active.map((note) => note.title).join(", ")}`;
    });

    return await Effect.runPromise(
        // 까닭은 서버 기록에 남기고 답에는 싣지 않는다. 모델이 그 원문을 사람에게 옮겨 말할 수 있다
        listed.pipe(Effect.catch((error) =>
            Effect.logWarning(`쪽지를 읽지 못했다: ${String(error)}`).pipe(Effect.as("쪽지를 읽지 못했어요.")))),
    );
}

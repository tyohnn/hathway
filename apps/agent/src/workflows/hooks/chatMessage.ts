import { defineHook } from "workflow";
import { z } from "zod";

/**
 * 도는 대화에 사람이 말을 더 거는 자리.
 *
 * ⚠ **토큰은 실행 번호다.** 실행 하나가 대화 하나라서 화면이 그 대화의 주소로 말을 보낸다.
 * ⚠ **훅은 워크플로가 한 번만 만든다.** 같은 토큰으로 두 번 만들면 충돌한다(`chat.ts`).
 * ⚠ **zod 를 쓰는 자리다.** 저장소 규약의 「검증은 Effect Schema 로 한다」가 막는 것은 우리가 쓰는 검증이고,
 *    이 스키마는 Workflow 런타임이 훅을 깨울 때 제 손으로 읽는 모양이다. 도메인 판정을 여기에 두지 않는다.
 *    말을 걸 수 있는지는 부르는 쪽이 `canTalk` 로 이미 쟀다.
 */
export const chatMessageHook = defineHook({
    schema: z.object({
        /** 장부에 이 말을 적을 이름. 화면이 붙인 메시지 id 에서 온다(INV-AGENT-03) */
        key: z.string(),
        text: z.string(),
    }),
});

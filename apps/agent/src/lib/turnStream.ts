/**
 * 워크플로 스트림에서 **턴 하나**만 떼어 낸다.
 *
 * 대화 하나가 실행 하나라서 스트림 하나에 턴이 차례로 쌓인다. 워크플로는 턴이 끝날 때마다 `{ type: "finish" }`
 * 한 조각을 적는데(`chat.ts` 의 `sendFinish`), UI 조각으로 바꾸는 변환(`createModelCallToUIChunkTransform`)은
 * 그 조각을 옮기지 않고 **스트림이 닫힐 때만** `finish` 를 낸다. 그래서 턴이 끝나도 화면은 답을 기다린다.
 * 이 변환이 턴의 끝에서 응답을 닫으면 뒤의 변환이 `finish` 를 내고 화면의 전송이 그 턴을 마친다.
 *
 * ⚠ **모델의 `finish` 와 턴의 `finish` 를 가른다.** 모델 호출 한 번이 끝날 때 오는 조각은 끝난 까닭
 *    (`finishReason`)을 들고 있고, 도구를 부르는 턴에서는 그 뒤에 걸음이 더 이어진다. 턴의 끝은 까닭이 없는
 *    조각이다.
 */
export const isTurnEnd = (part: unknown): boolean =>
    typeof part === "object"
    && part !== null
    && (part as { type?: unknown }).type === "finish"
    && !("finishReason" in part);

export const untilTurnEnd = <T>(): TransformStream<T, T> =>
    new TransformStream<T, T>({
        transform: (part, controller) =>
        {
            if (isTurnEnd(part))
            {
                controller.terminate();

                return;
            }

            controller.enqueue(part);
        },
    });

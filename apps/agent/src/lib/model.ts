import { REHEARSAL_MODEL_ID } from "@/workflows/rehearsalModel";

/**
 * 이번 대화가 쓸 모델을 고른다. 실행을 거는 라우트가 부르고 그 값을 워크플로의 인자로 넘긴다.
 *
 * ⚠ **워크플로 안에서 환경 변수를 읽지 않는다.** 재생은 같은 인자로 같은 차례를 다시 세워야 하므로
 *    바깥의 값은 인자로 들어간다.
 * ⚠ **연습 모드는 정확히 `rehearsal` 일 때만 걸린다.** 게이트웨이 키가 없는 로컬과 e2e 가 쓴다.
 */
export const DEFAULT_MODEL = "anthropic/claude-sonnet-5.5";

export const chosenModel = (env: Record<string, string | undefined> = process.env): string =>
{
    if (env["AGENT_RUNNER"] === "rehearsal")
    {
        return REHEARSAL_MODEL_ID;
    }

    const model = env["AGENT_MODEL"]?.trim();

    return model === undefined || model === "" ? DEFAULT_MODEL : model;
};

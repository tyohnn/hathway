/**
 * 로컬 큐가 워크플로 본문을 실행하는 요청을 얼마나 기다리나 (2026-09-17).
 *
 * ⚠ **기본값 30초가 에이전트의 턴을 죽인다.** 로컬 큐는 워크플로 한 조각을 우리 서버의 `/flow` 로
 *    POST 하고, 그 요청이 **워크플로 본문을 통째로 돈다.** 도구를 몇 번 부르는 턴은 30초를 쉽게 넘기고,
 *    그러면 전송이 `TypeError: fetch failed` 로 끊긴다.
 *
 * ⚠ **끊기면 실행이 죽는다. 되살아나지 않는다.** 큐는 같은 메시지를 다시 배달하고, 재배달은 그 메시지가
 *    소유하던 인라인 스텝을 다시 돌린다. 그런데 모델 호출 스텝은 `@ai-sdk/workflow` 가
 *    `doStreamStep.maxRetries = 0` 으로 **일부러** 박아 두었다 - 스트림은 이미 조각을 내보냈으니 다시
 *    돌리면 안 되기 때문이다. 그래서 재배달 한 번이 곧 `Step exceeded max retries` 이고 실행은 `failed`
 *    로 끝난다. 화면에는 까닭이 서지 않고 「실행이 failed 로 끝났습니다」 한 줄만 남는다.
 *
 * ⚠ **재시도가 아무것도 사지 못하므로 넉넉히 기다리는 편이 낫다.** 여느 시스템이라면 짧은 타임아웃이
 *    멈춘 전송을 빨리 되살리는데, 여기서는 되살릴 것이 없다 - 재배달이 곧 죽음이다. 그래서 한도를
 *    한 턴이 실제로 걸릴 수 있는 길이 위로 올린다.
 *
 * ⚠ **무한(`0`)으로 두지 않는다.** 진짜로 멈춘 전송이 영영 매달리는 자리를 남기지 않기 위해서다.
 *
 * ⚠ **이미 적힌 값을 덮지 않는다.** 재현하거나 값을 재 보려면 밖에서 넣을 수 있어야 한다.
 *
 * ## 실측 (2026-09-17)
 *
 * | 한도 | 무엇이 일어났나 |
 * |---|---|
 * | `1000` | 자문 요약 한 번에 전송 실패 1 · 스텝 사망 2. **반드시** 난다 |
 * | `30000`(기본값) | 도구를 다섯 번 부르는 긴 턴에서만 난다. 그래서 간헐적으로 보인다 |
 * | `600000`(지금) | 45초 걸린 턴이 전송 실패 0 으로 끝났다 |
 */
export const QUEUE_TIMEOUT_MS = "600000";

/** 큐가 읽는 두 칸. 이름은 `@workflow/world-local` 의 `getQueueAgentOptions` 가 정한다 */
export const QUEUE_TIMEOUT_KEYS = [
    "WORKFLOW_LOCAL_HEADERS_TIMEOUT_MS",
    "WORKFLOW_LOCAL_BODY_TIMEOUT_MS",
] as const;

/**
 * 이보다 짧은 한도는 경고한다.
 *
 * 실측으로 45초 걸린 턴이 있었으므로(위의 표), 한 턴이 이 값을 넘는 일은 드물지 않다. 밖에서 넣은 값이
 * 이기는 것은 재현을 위해 그대로 두되, 그 값이 짧으면 **왜 실행이 까닭 없이 죽는지**를 부팅 로그가 먼저
 * 말해 준다. 그 자리에 한참 걸린 세션이 있었다.
 */
export const QUEUE_TIMEOUT_FLOOR_MS = 60_000;

/**
 * 한도를 정하고, 밖에서 넣은 값이 짧거나 읽히지 않으면 그 사실을 돌려준다.
 *
 * ⚠ **`next.config.ts` 에서 부른다.** 그 파일은 서버가 뜰 때 같은 프로세스에서 한 번 돌고, 큐는 첫 요청이
 *    닿을 때 만들어진다. 라우트 안에서 부르면 어느 라우트가 먼저 닿는지에 기대게 된다.
 *
 * ⚠ **찍는 일을 여기서 하지 않는다.** 이 함수가 순수해야 무엇을 경고하는지가 도커 없이 검사된다. 찍는
 *    자리는 부르는 쪽이다.
 */
export const tuneQueueTimeouts = (env: Record<string, string | undefined>): ReadonlyArray<string> =>
{
    const notices: Array<string> = [];

    for (const key of QUEUE_TIMEOUT_KEYS)
    {
        const written = env[key];

        if (written === undefined || written === "")
        {
            env[key] = QUEUE_TIMEOUT_MS;

            continue;
        }

        const limit = Number(written);

        if (!Number.isFinite(limit))
        {
            notices.push(`${key} 에 숫자가 아닌 값(${written})이 적혀 있다. 큐는 제 기본값 30초로 돌아간다`);

            continue;
        }

        if (limit < QUEUE_TIMEOUT_FLOOR_MS)
        {
            notices.push(
                `${key} 가 ${limit}ms 다. 도구를 몇 번 부르는 턴은 이보다 오래 걸리고, 잘린 전송은 `
                + "재배달되며 재배달은 모델 호출 스텝을 죽인다. 그 실행은 까닭 없이 failed 로 끝난다", // ux-writing: 부팅 로그
            );
        }
    }

    return notices;
};

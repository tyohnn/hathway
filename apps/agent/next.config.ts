import { Effect } from "effect";
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

import { tuneQueueTimeouts } from "./src/lib/workflowQueue";

/**
 * ⚠ **큐의 전송 한도를 부팅 때 정한다**(`lib/workflowQueue.ts` 에 까닭이 있다). 기본값 30초는 도구를
 *    몇 번 부르는 턴을 잘라 내고, 잘린 전송은 재배달되며 재배달은 모델 호출 스텝을 죽인다.
 *    이 파일은 서버가 뜰 때 같은 프로세스에서 한 번 돌고 큐는 첫 요청이 닿을 때 만들어진다.
 */
for (const notice of tuneQueueTimeouts(process.env))
{
    Effect.runFork(Effect.logWarning(notice));
}

// e2e 가 프로덕션 빌드를 세울 때만 넘겨 주는 값이다(`playwright.config.ts`).
const EXPOSE_TESTING_API = process.env.EXPOSE_TESTING_API === "1";

const nextConfig: NextConfig =
{
    // phosphor 의 기본 진입점은 모듈을 읽는 순간 React 컨텍스트를 만들어 서버 컴포넌트에서 깨진다.
    // `@hathway/ui/icons` 를 서버에서도 부르므로 컨텍스트 없는 ssr 진입점으로 돌린다. 그림은 같다
    turbopack: {
        resolveAlias: {
            "@phosphor-icons/react": "@phosphor-icons/react/dist/ssr",
        },
    },

    // 워크스페이스 패키지는 raw TS 로 소비한다(빌드 산출물이 없다).
    // ⚠ `@hathway/blocks` 를 빠뜨리면 오류 없이 블록의 스타일만 빈다. `globals.css` 의 `@source` 와 짝이다
    transpilePackages: [
        "@hathway/shared",
        "@hathway/ui",
        "@hathway/blocks",
        "@hathway/agents",
        "@hathway/notes",
        "@hathway/access",
    ],

    // ⚠ Cache Components 를 처음부터 켠다. 요청 데이터를 <Suspense> 밖에서 읽으면 빌드가 실패한다.
    cacheComponents: true,

    ...(EXPOSE_TESTING_API
        ? { experimental: { exposeTestingApiInProductionBuild: true } }
        : {}),
};

/**
 * ⚠ **Workflow DevKit 을 통과시킨다.** `'use workflow'` · `'use step'` 이 붙은 함수를 내구성 있는 실행으로
 *    바꾸는 것이 이 한 줄이고, 로컬은 번들 백엔드(`.workflow-data/`)로 무설정이다. 배포에서는 Vercel 의
 *    큐와 저장소가 같은 자리를 맡는다.
 * ⚠ `workflow` 는 아직 beta 다. 판을 올릴 때는 e2e 를 실물 모델(`E2E_RUNNER=workflow`)로 한 번 돌린다.
 */
export default withWorkflow(nextConfig);

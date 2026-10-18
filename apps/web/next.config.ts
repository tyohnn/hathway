import createMDX from "@next/mdx";
import type { NextConfig } from "next";

// e2e 가 프로덕션 빌드를 세울 때만 넘겨 주는 값이다(`playwright.config.ts`).
const EXPOSE_TESTING_API = process.env.EXPOSE_TESTING_API === "1";

// scaffold:module posthog begin
// 분석 이벤트를 우리 주소(`/ingest`)로 받아 PostHog 로 넘긴다. 광고 차단기가 PostHog 의 주소를 막아도 이벤트가 온다.
// ⚠ 리전은 `src/modules/posthog/config.ts` 와 같은 값을 읽는다. 빌드 때 정해진다
const POSTHOG_HOSTS = process.env.NEXT_PUBLIC_POSTHOG_REGION === "eu"
    ? { ingest: "https://eu.i.posthog.com", assets: "https://eu-assets.i.posthog.com" }
    : { ingest: "https://us.i.posthog.com", assets: "https://us-assets.i.posthog.com" };
// scaffold:module posthog end

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
        "@hathway/notes",
        "@hathway/access",
        "@hathway/schema",
        "@hathway/market",
        "@hathway/research",
        "@hathway/adapters-postgres",
        "@hathway/adapters-storage",
        "@hathway/preferences", // scaffold:module plugin
        "@hathway/analytics", // scaffold:module posthog
        "@hathway/adapters-posthog", // scaffold:module posthog
    ],

    // 옮겨 간 옛 주소를 넘긴다. 바깥에 걸린 링크와 검색 색인이 죽지 않게 한다
    redirects: async () => [
        // 2026-08 셸 IA: 테마(/stocks|/real-estate) 아래 섹션으로 올렸다
        { source: "/company", destination: "/stocks/analysis", permanent: true },
        { source: "/company/:code", destination: "/stocks/analysis/:code", permanent: true },
        { source: "/company/:code/:menu", destination: "/stocks/analysis/:code/:menu", permanent: true },

        { source: "/lab/:code/filing/:rceptNo/:secNo", destination: "/stocks/analysis/:code/filing/:rceptNo/:secNo", permanent: true },
        { source: "/lab/:code/financials", destination: "/stocks/analysis/:code/primary", permanent: true },
        { source: "/lab/:code/revenue", destination: "/stocks/analysis/:code/valuation", permanent: true },
        { source: "/lab/:code/numbers", destination: "/stocks/analysis/:code/primary", permanent: true },
        { source: "/lab/:code/people", destination: "/stocks/analysis/:code/primary", permanent: true },
        { source: "/lab/:code/study", destination: "/stocks/analysis/:code/verdict", permanent: true },
        { source: "/lab/:code/agent", destination: "/stocks/analysis/:code/verdict", permanent: true },
        { source: "/lab/:code/:board", destination: "/stocks/analysis/:code/:board", permanent: true },
        { source: "/lab/:code", destination: "/stocks/analysis/:code/verdict", permanent: true },

        { source: "/industry", destination: "/stocks/macro/industries", permanent: true },
        { source: "/industry/:slug", destination: "/stocks/macro/industries/:slug", permanent: true },
    ],

    // scaffold:module posthog begin
    // PostHog 의 주소는 끝에 `/` 가 붙은 것과 아닌 것을 가른다. Next 가 끝의 `/` 를 떼려고 돌려보내면 이벤트가 깨진다
    skipTrailingSlashRedirect: true,
    rewrites: async () => [
        { source: "/ingest/static/:path*", destination: `${POSTHOG_HOSTS.assets}/static/:path*` },
        { source: "/ingest/array/:path*", destination: `${POSTHOG_HOSTS.assets}/array/:path*` },
        { source: "/ingest/:path*", destination: `${POSTHOG_HOSTS.ingest}/:path*` },
    ],
    // scaffold:module posthog end

    // ⚠ Cache Components 를 처음부터 켠다. 켜면 모든 라우트가 프리렌더 가능해야 하고, 요청 데이터
    //    (cookies · headers · params · searchParams)를 <Suspense> 밖에서 읽으면 빌드가 실패한다.
    //    나중에 켜면 blocking route 를 무더기로 수습해야 하므로 새 앱인 지금 켜는 편이 싸다.
    //    함께 금지되는 것: `export const dynamic | revalidate | fetchCache`, Edge runtime, static export.
    cacheComponents: true,

    // ⚠ 켜는 때에만 얹는다. false 로라도 적어 두면 빌드 로그에 「Experiments」 줄이 찍혀 배포마다 끄지 않은
    //    실험이 있는 것처럼 읽힌다.
    ...(EXPOSE_TESTING_API
        ? { experimental: { exposeTestingApiInProductionBuild: true } }
        : {}),
};

/**
 * 블로그 · 문서 · 새 소식의 본문은 저장소의 MDX 다(`src/content/`). 목록과 제목은 TS 파일이 갖고 본문만 MDX 로 불러온다.
 * ⚠ 플러그인을 더할 때는 Turbopack 이 읽을 수 있게 모듈 이름(문자열)으로 적는다.
 */
const withMDX = createMDX({});

export default withMDX(nextConfig);

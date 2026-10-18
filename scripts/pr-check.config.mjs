/**
 * `pr-check.mjs` 가 읽는 이 저장소의 설정이다. dev-playbook 의 예시에서 받아 hathway 의 값으로 채웠다.
 *
 * 값이 없는 칸(null)은 그 검사를 쓰지 않는다는 뜻이고, 표에는 「이 저장소는 쓰지 않음」이 통과로 남는다.
 * 빈칸으로 두지 않는 까닭은 보는 사람이 「안 돌렸는지 쓰지 않는지」 알 수 없게 되기 때문이다.
 *
 * 형태
 *
 *   baseBranch   PR 이 향하는 브랜치. 바뀐 파일은 이것과 견준다(예: "origin/main")
 *   runner       "turbo"  Turborepo 모노레포. typecheck · test · build 를 `turbo run --affected` 로 돈다
 *                "npm"    패키지 하나짜리 저장소. `npm run typecheck|test|build` 를 한 번씩 돈다(없는 스크립트는 실패로 적힌다)
 *   stack        계약 테스트와 e2e 가 붙는 로컬 스택. 포트가 모두 열려 있어야 시작한다. 스택이 필요 없으면 null
 *   e2e.apps     e2e 가 있는 앱. 이름은 워크스페이스 이름(runner "npm" 이면 아무 이름)
 *                dir: 앱 폴더, ports: Playwright 가 쓰는 포트(비어 있어야 시작), select: false 면 스펙을 고르지 않고 늘 전체
 *   vercel       Vercel 로 배포하면 프로젝트 id 를 적는다. 쓰지 않으면 null
 *   icons        화면이 디자인 시스템의 아이콘만 쓰게 하려면 직접 부르면 안 되는 라이브러리를 적는다. 쓰지 않으면 null
 *   copy         화면 글 검사기. 쓰지 않으면 null
 *   screens      화면 파일을 가르는 무늬. 아이콘과 화면 글 검사가 이것으로 바뀐 화면 파일을 고른다
 */

export default {
    baseBranch: "origin/main",
    runner: "turbo",

    // Supabase 로컬 스택(5436x 대역). DB 와 API 게이트웨이 두 포트다
    stack: {
        ports: [54362, 54361],
        startHint: "`npx supabase start` 로 띄운 뒤",
    },

    e2e: {
        apps: {
            // 두 앱 모두 닫힌 서버(배포 모양)와 열린 서버(ALLOW_LOCAL_ACCOUNTS=1)를 함께 띄운다
            "@hathway/web": { dir: "apps/web", ports: [4400, 4401] },
            "@hathway/agent": { dir: "apps/agent", ports: [4410, 4411] },
        },
    },

    // 이 설치는 Vercel 연결을 다루지 않는다. 프로젝트를 이으면 dev-playbook 의 예시대로 프로젝트 id 를 적는다
    vercel: null,

    // 화면은 `@hathway/ui/icons` 의 의미 이름만 부른다. 아이콘 라이브러리는 packages 안에서만 import 한다
    icons: {
        libraries: ["lucide-react", "@hugeicons/[^\"']*", "react-icons[^\"']*"],
        hint: "`@hathway/ui/icons` 의 의미 이름",
    },

    copy: { command: ["node", ".claude/skills/ux-writing/scripts/scan-copy.mjs"] },

    screens: {
        pattern: "^(apps\\/[^/]+\\/src)\\/.+\\.tsx?$",
        copyPattern: "^(apps\\/[^/]+\\/src)\\/.+\\.(tsx?|mdx)$",
        dirs: ["apps"],
    },
};

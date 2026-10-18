# 플러그인 모듈을 코어에 잇는 자리

모듈이 가진 자리(`owns.json` 의 `paths`)는 통째로 복사하거나 지우면 된다. 이 파일은 그 밖에서 **코어의 파일에 잇는 자리**를
적는다. 둘로 나뉜다.

- **표시 줄(기계식).** 줄 끝이나 블록에 `scaffold:module plugin` 이 붙어 있다. 뗄 때는 그 줄(블록은 `begin` ~ `end`)을 걷고,
  붙일 때는 아래의 줄을 그 파일의 같은 자리에 되살린다. `create.sh --with` 와 `module-patch.mjs` 가 이 일을 한다.
- **판단이 드는 자리(에이전트).** 표 · 문장 · JSON 처럼 표시를 달 수 없거나, 프로젝트마다 모양이 갈라졌을 수 있는 자리다.
  `/scaffold-add` · `/scaffold-remove` 스킬이 이 파일을 읽고 그 프로젝트에 맞춰 고친 뒤 무엇을 고쳤는지 보고한다.

붙이거나 뗀 뒤에는 `acceptance.json` 의 검사를 모두 지난다.

## 표시 줄

| 파일 | 줄 | 하는 일 |
|---|---|---|
| `apps/web/src/lib/modules.ts` | `import { pluginExtensions } from "@/modules/plugin/extensions";` · `pluginExtensions,` | 확장 지점 `McpSurface` 를 채운다 |
| `apps/web/next.config.ts` | `"@hathway/preferences",` | 워크스페이스 패키지를 옮겨 쓴다 |
| `packages/shared/scripts/check-dependencies.mjs` | `LAYER` 의 한 줄 | 새 패키지의 층 |
| `packages/shared/scripts/check-invariants.mjs` | `CATALOGS` 의 한 줄 · 머리말 한 줄 · `SCAN_ROOTS` 의 한 줄 | `INV-PREFERENCE-*` 카탈로그 |
| `packages/shared/scripts/check-comments.mjs` | `SCOPE` 의 한 줄 | 새 패키지의 주석을 지침으로 대조한다 |
| `apps/web/src/content/legal/privacy.mdx` | 1절 · 3절의 줄 · 1절의 「설정」 `begin` ~ `end` 블록 | 처리방침의 파일 가져오기, 플러그인의 설정, ChatGPT 에 알려 주는 쪽지 |
| `apps/web/src/content/legal/terms.mdx` | 제5 · 9조의 줄 | 약관의 ChatGPT 안의 기능과 OpenAI 상표 |

## 판단이 드는 자리

### package.json (`owns.json` 의 `dependencies`)

- `apps/web/package.json` 의 `@hathway/preferences` 와 `esbuild`(화면을 굽는다)
- `packages/adapters-postgres/package.json` 의 `@hathway/preferences`
- 고친 뒤 `npm install` 로 `package-lock.json` 을 다시 세운다. 잠금 파일을 손으로 고치지 않는다.

### CI 의 조합

- `.github/workflows/check.yml` 의 `modules` 잡이 도는 조합 목록(`matrix.with`)에 `plugin` 이 있다. 뗐으면 그 이름을 뺀다.

### 문서 (`owns.json` 의 `docs`)

만들 때(`create.sh --with`)는 `owns.json` 의 `docs` 가 가리키는 줄을 기계식으로 걷는다. 이미 갈라진 프로젝트에서는 아래
표를 보고 같은 뜻의 줄을 찾아 고친다.

### 루트 CLAUDE.md

| 절 | 플러그인의 자리 |
|---|---|
| 워크스페이스 표 | `packages/preferences` 줄 |
| 약어 표 | `INV-PREFERENCE-01` 줄 |
| 로컬 스택 | 「플러그인(`modules/plugin`)의 도구는」 줄 |
| 데이터베이스 표 | `preferences` 스키마 줄 |

### apps/web/CLAUDE.md

| 절 | 플러그인의 자리 |
|---|---|
| 확장 지점과 모듈 표 | `src/modules/plugin/` 줄 |
| MCP | 「플러그인 모듈이 있으면 같은 주소가」 줄 |
| e2e 표 | `plugin.spec.ts` 줄 |

### 코어의 동작이 플러그인에 기대는 자리

- **확장 지점 `McpSurface` 와 MCP 의 조립(`usecases/mcp.ts`)은 코어다.** 떼어도 남는다. 기본 구현이 서서 코어의 도구 둘만 돈다.
  두 시대(옛 판 · 2026-07-28)를 받는 봉투(`lib/mcp.ts`)도 코어에 남는다.
- **코어의 MCP 스펙(`e2e/mcp.spec.ts`)은 도구 목록의 앞 둘만 본다.** 이 모듈의 도구가 뒤에 서도 깨지지 않게 한 것이고,
  떼어도 그대로 둔다.
- **요금제의 문에 서는 글**(「Claude 연결은 프로 요금제부터…」)은 코어의 글이다. ChatGPT 로 붙은 사람도 이 글을 본다. 제품의
  말이 정해지면 `usecases/mcp.ts` 의 `LOCKED` 를 고친다.
- **플러그인 패키지의 이름.** `plugin/plugin.json` 의 `name` 과 `.agents/plugins/marketplace.json` 의 이름은 프로젝트를 만들 때
  제품의 이름으로 바뀐다. 폴더 이름(`plugin/`)은 바뀌지 않아서 마켓플레이스의 `source.path` 가 그대로 맞는다.

## 붙일 때의 차례

`/scaffold-add plugin` 스킬이 이 차례를 밟는다.

1. `node <원본>/scripts/module-patch.mjs add plugin --project .` 이 가진 자리를 복사하고 표시 줄 · 의존 · 문서 줄을 패치로 붙인다.
2. 붙지 않은 조각(`.rej`)을 위 표를 보고 같은 뜻의 자리에 잇는다. 확장 지점 `McpSurface` 가 없는 오래된 코어라면 멈추고
   알린다. 코어부터 원본에 맞추는 것은 다른 일이다.
3. 스크립트가 마이그레이션이 더 늦은 것보다 앞선다고 알리면 판단한다. 원격에 이미 올린 프로젝트면 이름을 늦은 시각으로 바꾼다.
4. 예시 도메인 `notes` 를 걷었거나 이름을 바꾼 프로젝트면, 이 모듈의 도구와 화면이 부르는 유스케이스(`listNotes` ·
   `openNote` · `createNote`)를 그 제품의 것으로 바꾼다. 사람과 함께 어느 화면을 사이드바에 세울지부터 정한다.
5. `npm install` → `supabase migration up`(이미 쓰는 DB) 이나 `supabase db reset` 뒤 `acceptance.json` 을 모두 지난다.
6. 고친 자리를 목록으로 보고한다. 사람이 할 일(`module.md` 의 「실물 ChatGPT 에 붙이려면」)을 함께 적는다.

## 뗄 때의 차례

`/scaffold-remove plugin` 스킬이 이 차례를 밟는다.

1. 원격 DB 에 `preferences` 스키마가 이미 있으면 **지우는 마이그레이션을 새로 쓰지 말고 사람에게 묻는다.** 사람들이 고른
   설정이 사라진다.
2. `node <원본>/scripts/module-patch.mjs remove plugin --project .` 이 가진 자리를 지우고 표시 줄 · 의존 · 문서 줄을 걷는다.
3. 붙지 않은 조각과 남은 표시 줄을 걷는다. CI 의 조합 목록에서 `plugin` 을 뺀다.
4. `npm install` 뒤 `acceptance.json` 의 `checks` 와 코어의 검사(turbo typecheck test · web e2e)를 지난다. 이 모듈의
   `unit` · `contract` · `e2e` 는 함께 사라졌으니 돌리지 않는다.
5. ChatGPT 에 등록한 연결과 디렉터리에 올린 플러그인은 사람이 치운다. 보고에 적는다.

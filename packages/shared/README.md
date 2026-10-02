# @investment/shared

도메인이 아닌 공용 모듈을 둡니다. 도메인 코드는 그 도메인 패키지에 두고, 여기에 새 모듈을 계속 더하지 않습니다.

| 모듈 | 쓰는 곳 |
|---|---|
| `constants/tenancy` | 테넌트 종류. `packages/access` 가 앱의 문을 판정하는 데 씁니다 |
| `invariants/types` · `invariants/requirements` | 불변식 카탈로그의 공통 타입과 도메인이 없는 저장소 규약(`REQ-*`) |
| `utils/formatters` · `utils/dateFormatting` | `packages/blocks` 의 표 셀 표기 |

로그가 필요하면 `Effect.logWarning` 계열을 쓰고, Effect 밖이라면 `runFork` 로 띄웁니다.

## 데이터베이스와 맞아야 하는 것

⚠ **`constants/tenancy` 는 `org.tenant.kind` 의 CHECK 제약과 맞아야 합니다.** 코드만 고치고 데이터베이스를
그대로 두면 문을 여는 판정이 어긋나고, 그 사실이 어느 화면에도 드러나지 않습니다.

## 저장소 검사 스크립트

`scripts/` 의 넷은 `turbo test` 가 함께 돌립니다.

| 스크립트 | 무엇을 막나 |
|---|---|
| `check-invariants.mjs` | 없는 불변식 id 를 인용하거나 `enforced` 인데 지키는 테스트가 없는 것 |
| `check-comments.mjs` | 주석의 엠대시 · 명사형 종결 · 연결어미 종결(범위는 스크립트의 `SCOPE`) |
| `check-migrations.mjs` | 마이그레이션 판 번호가 겹치는 것 |
| `check-dependencies.mjs` | 선언하지 않은 `@investment/*` import · 층을 거스르는 의존 · 도메인의 effect 밖 런타임 의존 |

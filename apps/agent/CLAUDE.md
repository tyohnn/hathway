# agent

운영팀(`operator`)이 에이전트와 일하는 앱입니다. 로컬 개발 포트는 `4410` 이고 e2e 는 `4411` 에 로컬 계정이 열린
서버를 하나 더 띄웁니다. **대화 하나가 Workflow DevKit 의 실행 하나**라서, 서버가 다시 뜨거나 사람이 며칠 자리를
비워도 대화가 이어집니다.

개발 방법론의 정본은 `docs/개발-방법론.md` 이고, 로그인 · 관문 · 셸의 규약은 web 과 같아서 `apps/web/CLAUDE.md` 가
갖습니다. 여기에는 이 앱에만 있는 실행 경로를 적습니다. 까닭은
`docs/decisions/2026-09-29-대화-하나가-워크플로-실행-하나다.md` 에 있습니다.

## 라우트

| 라우트 | 무엇 |
|---|---|
| `/chat` | 새 대화와 지난 대화 |
| `/chat/[runId]` | 대화 하나. 지난 말은 장부에서 읽고, 연 사람이 아니면 404 |
| `POST /api/chat` | 첫 말로 실행을 건다. 첫 턴의 스트림을 돌려준다 |
| `POST /api/chat/[runId]` | 도는 대화의 훅을 깨운다. 그 턴의 스트림을 돌려준다 |
| `GET /api/chat/[runId]/turns/[start]/stream` | 끊긴 턴에 다시 붙는다 |
| `/.well-known/workflow/*` | Workflow 가 스스로 만드는 경로. 미들웨어가 지나가지 않는다 |

## 실행 경로

```
ChatPanel(useChat + WorkflowChatTransport)
  ├─ 첫 말 ──▶ POST /api/chat ──start(chat)──▶ workflows/chat.ts
  │                                              ├─ steps/ledger.openConversationStep   장부의 줄을 연다
  │                                              ├─ WorkflowAgent.stream(턴)             모델 · 도구
  │                                              │    └─ tools.list_my_notes ─▶ steps/listNotes.ts
  │                                              │         행위자를 계정 id 로 다시 세우고 NoteStore 의 술어를 지난다
  │                                              ├─ steps/ledger.appendMessageStep       에이전트의 말을 적는다
  │                                              └─ await chatMessageHook                 컴퓨트 없이 기다린다
  └─ 이어 말 ──▶ POST /api/chat/[runId] ──canTalk──▶ chatMessageHook.resume
```

- ⚠ **워크플로는 행위자를 나르지 않습니다**(INV-AGENT-04). 계정 id 를 나르고 도메인에 닿는 스텝이 그 순간
  `actorForAccountId` 로 다시 세웁니다. `workflows/boundary.test.ts` 가 소스를 읽어 이것을 지킵니다.
- ⚠ **워크플로 본체에서 시각 · 난수 · 환경 변수를 읽지 않습니다.** 재생이 같은 차례를 다시 세워야 합니다. 모델
  이름도 라우트가 정해(`lib/model.ts`) 인자로 넘깁니다.
- ⚠ **DB 에 닿는 일은 전부 스텝입니다**(`"use step"`). 스텝은 실패하면 다시 돌므로 쓰기는 멱등이어야 하고
  (INV-AGENT-03), 장부는 그것을 `(conversation_id, key)` 유일 제약으로 지킵니다.
- ⚠ **사람의 말은 스트림에 실리지 않습니다.** 새로 고친 화면이 대화를 다시 세우는 자리는 장부(`agent.message`)입니다.
- ⚠ **턴의 끝에서 응답을 끊습니다**(`lib/turnStream.ts`). 워크플로가 턴마다 `finish` 를 적어도 UI 변환은 스트림이
  닫혀야 `finish` 를 내므로, 끊지 않으면 화면이 「답을 기다리는 중」에 머뭅니다.
- ⚠ **클라이언트는 `@ai-sdk/workflow/client` 에서 전송을 가져옵니다.** 패키지 뿌리에서 가져오면 워크플로 런타임이
  브라우저 번들에 끌려와 빌드가 깨집니다.
- ⚠ **큐의 전송 한도를 부팅 때 늘립니다**(`lib/workflowQueue.ts` · `next.config.ts`). 기본 30초는 도구를 몇 번 부르는
  턴을 잘라 내고, 잘린 전송의 재배달은 모델 호출 스텝을 죽입니다.
- 게이트웨이의 자동 캐시(`workflows/modelCallOptions.ts`)를 켭니다. 도구를 부르는 걸음마다 대화 전체가 온값으로
  청구되는 것을 막습니다.

## 모델

| `AGENT_RUNNER` | 모델 |
|---|---|
| `rehearsal` | 연습 모델(`workflows/rehearsalModel.ts`). 「쪽지」라는 말에 도구를 부르고 그 밖에는 되받아 적는다 |
| 비움 | 게이트웨이의 `AGENT_MODEL`, 없으면 `anthropic/claude-sonnet-5.5` |

- 연습 모델은 워크플로 밖의 가짜 실행기가 아닙니다. **모델 호출 한 자리만** 바꾸므로 e2e 가 워크플로 · 스텝 · 도구 ·
  장부를 실물과 같은 길로 끝까지 잽니다. 직렬화는 `WORKFLOW_SERIALIZE` · `WORKFLOW_DESERIALIZE` 가 맡습니다.
- 실물 모델로 e2e 를 돌리려면 `E2E_RUNNER=workflow` 를 줍니다. 그때 연습 모델의 정해진 답을 재는 단언은 빨개지는 것이 옳습니다.

## 도구를 더할 때

1. 도구가 닿는 도메인의 읽기 · 쓰기가 이미 포트와 술어를 갖고 있는지 본다. 없으면 도메인 패키지부터 세운다
2. `workflows/steps/<도구>.ts` 에 스텝을 둔다. 첫 줄에서 `actorForAccountId` 로 행위자를 다시 세우고, 막힌 것은 던지지
   않고 까닭을 답으로 돌려준다
3. `workflows/chat.ts` 의 `tools` 에 이름 · 설명 · `jsonSchema` 입력 · `execute`(그 스텝)를 더한다. 입력에 테넌트나 계정을
   받지 않는다
4. 쓰는 도구라면 승인이 필요한지 먼저 정한다. 승인은 훅(도구 호출 id 를 토큰으로)으로 걸고, 화면이 그 답을 건넨다
5. 연습 모델의 규칙과 e2e 에 그 도구의 한 줄을 더한다

## e2e

| 스펙 | 지키는 것 |
|---|---|
| `smoke.spec.ts` | 세션 없이는 셸과 대화 창구에 닿지 못한다 |
| `access.spec.ts` | 운영팀만 들어온다. 고객은 `/no-access` |
| `chat.spec.ts` | 도구가 행 단위 술어를 지나고(INV-NOTE-01), 이어 말하기가 같은 실행을 깨우고, 새로 고쳐도 장부에서 대화가 서며, 남의 대화는 주소를 알아도 열리지 않는다(INV-AGENT-01) |

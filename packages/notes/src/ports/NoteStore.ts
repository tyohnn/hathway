import { Context, type Effect, Schema } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";

import type { NewNote, Note } from "../domain/Note.ts";
import type { NotePage, NoteQuery } from "../domain/NoteQuery.ts";

/**
 * 쪽지를 읽고 쓰는 포트. 구현은 메모리(`testing/noteStoreMemory.ts`)와 Postgres
 * (`@hathway/adapters-postgres/notes/NoteStorePostgres`) 둘이고, 계약 테스트 한 벌이 둘을 함께 잰다.
 *
 * ⚠ **연산마다 메서드가 하나다.** `query(sql)` 같은 범용 포트를 두면 앱이 조건을 적게 되고, 행 단위
 *    판정이 SQL 로 흩어진다. 판정의 정본은 `rules/visibility.ts` 이고 읽는 메서드는 행위자를 받는다.
 * ⚠ **읽는 메서드는 볼 수 있는 것만 돌려준다.** 볼 수 없는 행은 목록에서 빠지고 하나를 찾으면 `null`
 *    이다(INV-NOTE-02). 부르는 쪽이 한 번 더 거르지 않아도 되게 하려는 것이지, 거르는 술어를 여기
 *    한 벌 더 두려는 것이 아니다. 구현이 술어와 같은 집합을 내는지는 계약 테스트가 잰다.
 * ⚠ **목록 화면은 한 쪽씩 읽는다**(`listPage`). 거르고 자르고 세는 일을 질의가 한다. 다 읽어 화면 앞에서 자르면 쪽지가 쌓일수록
 *    모든 요청이 느려진다. `listVisible` 은 다 읽어도 되는 자리(홈의 칸 나누기 · 도구의 답)가 쓴다.
 * ⚠ **보관은 조건부 쓰기다.** 판정(`archiveVerdict`)과 쓰기 사이에 다른 요청이 끼어들 수 있으므로,
 *    쓰기가 쓴 사람과 판과 상태를 조건으로 한 번 더 건다. 맞지 않으면 `conflict` 로 답한다.
 */
export class NoteStoreError extends Schema.TaggedError<NoteStoreError>()(
    "NoteStoreError",
    { message: Schema.String },
)
{}

export type ArchiveOutcome = "archived" | "conflict";

export interface ArchiveRequest
{
    readonly noteId: string;
    readonly authorId: string;
    readonly expectedVersion: number;
}

export class NoteStore extends Context.Service<NoteStore, {
    /** 이 사람이 볼 수 있는 쪽지. 보관한 것도 함께 오고, 최근에 쓴 것이 먼저다 */
    readonly listVisible: (actor: Actor) => Effect.Effect<ReadonlyArray<Note>, NoteStoreError>;
    /** 이 사람이 볼 수 있고 제목에 찾는 말이 든 쪽지의 한 쪽과 그 총수. 최근에 쓴 것이 먼저다 */
    readonly listPage: (actor: Actor, query: NoteQuery) => Effect.Effect<NotePage, NoteStoreError>;
    /** 볼 수 있으면 그 쪽지, 없거나 볼 수 없으면 `null` 이다 */
    readonly findVisible: (actor: Actor, noteId: string) => Effect.Effect<Note | null, NoteStoreError>;
    /** 판정을 지난 새 쪽지를 적는다. 판은 1 에서 시작한다 */
    readonly create: (note: NewNote) => Effect.Effect<Note, NoteStoreError>;
    readonly archive: (request: ArchiveRequest) => Effect.Effect<ArchiveOutcome, NoteStoreError>;
}>()("@hathway/notes/ports/NoteStore")
{}

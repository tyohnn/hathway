import type { Actor } from "@hathway/access/domain/Actor";

import type { Note } from "../domain/Note.ts";

/**
 * 이 사람이 이 쪽지를 볼 수 있는가(INV-NOTE-01). **행 단위 판정의 단 하나의 자리다.**
 *
 * 목록과 상세와 에이전트의 도구가 모두 이 함수를 지난다. 어댑터의 질의(`NoteStorePostgres`)는 같은
 * 조건을 SQL 로 적은 것이고, 둘이 같은 집합을 돌려주는지는 계약 테스트가 잰다
 * (`testing/contracts/note-store.ts`). 한쪽만 고치면 그 검사가 빨개진다.
 *
 * ⚠ **테넌트를 먼저 가른다.** 공개 범위가 `tenant` 라는 것은 「그 테넌트 안에서 공개」라는 뜻이다.
 *    테넌트를 보지 않으면 다른 고객사의 쪽지가 보인다.
 * ⚠ **운영팀이라고 건너뛰지 않는다.** 우회가 필요해지면 그 술어도 이 함수 안에 적는다. 바깥에서
 *    「관리자니까」로 분기하는 순간 감사가 불가능해진다(`docs/개발-방법론.md` 「서버 액션 규약」).
 */
export const canSeeNote = (actor: Actor, note: Note): boolean =>
    note.tenantId === actor.tenantId
    && (note.visibility === "tenant" || note.authorId === actor.accountId);

/** 목록에서 볼 수 없는 것을 뺀다. 거부가 아니라 부재다(INV-NOTE-02) */
export const visibleNotes = (actor: Actor, notes: ReadonlyArray<Note>): ReadonlyArray<Note> =>
    notes.filter((note) => canSeeNote(actor, note));

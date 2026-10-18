import type { Note } from "./Note.ts";

/**
 * 쪽지 목록 한 쪽을 읽는 질의와 그 답. 주소(`?q=` · `?page=`)에서 오고, 다듬는 일은 `rules/listing.ts` 의 `noteQueryFrom` 이 한다.
 *
 * ⚠ **쪽 번호와 총수로 넘긴다.** 「24개 중 21–24 · 이전 · 다음」을 그리고 `?page=2` 를 남과 나눌 수 있어서다. 표가 아주 커져
 *    뒤쪽 쪽을 건너뛰는 비용이 보이면 커서(마지막으로 본 id)로 바꾼다. 그때도 포트의 모양은 이 둘이 바뀔 뿐이다.
 */
export interface NoteQuery
{
    /** 제목에서 찾는 말. 빈 문자열이면 찾지 않는다 */
    readonly q: string;
    /** 1 에서 시작한다 */
    readonly page: number;
    readonly pageSize: number;
}

export interface NotePage
{
    /** 이 쪽의 쪽지. 최근에 쓴 것이 먼저다 */
    readonly notes: ReadonlyArray<Note>;
    /** 질의에 맞고 이 사람이 볼 수 있는 쪽지의 수. 볼 수 없는 것은 세지 않는다(INV-NOTE-02) */
    readonly total: number;
}

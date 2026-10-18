import { Schema } from "effect";

/**
 * 쪽지 하나. 예시 도메인이 다루는 단 하나의 기록이다.
 *
 * ⚠ **`bigint` 인 id 는 문자열로 다닌다.** `pg` 가 `bigint` 를 문자열로 돌려주고, 자바스크립트의 수로
 *    바꾸면 큰 값에서 자리가 틀어진다. 어댑터가 그것을 전제하고 계약 테스트가 그 왕복을 잰다.
 */
export const NoteVisibility = Schema.Literals(["private", "tenant"]);

export type NoteVisibility = typeof NoteVisibility.Type;

export const NoteStatus = Schema.Literals(["active", "archived"]);

export type NoteStatus = typeof NoteStatus.Type;

export const Note = Schema.Struct({
    id: Schema.NonEmptyString,
    tenantId: Schema.NonEmptyString,
    authorId: Schema.NonEmptyString,
    title: Schema.String,
    body: Schema.String,
    visibility: NoteVisibility,
    status: NoteStatus,
    /** 고칠 때마다 하나씩 는다. 쓰기가 열었을 때의 판을 들고 와 대조한다(INV-NOTE-03) */
    version: Schema.Number,
    createdAt: Schema.String,
});

export type Note = typeof Note.Type;

/** 새로 쓸 쪽지. 판정(`rules/draft.ts`)을 지난 값만 이 모양이 된다 */
export interface NewNote
{
    readonly tenantId: string;
    readonly authorId: string;
    readonly title: string;
    readonly body: string;
    readonly visibility: NoteVisibility;
}

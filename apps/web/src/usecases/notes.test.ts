import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

import { customerActor, otherCustomerActor } from "@hathway/access/testing/actor";
import { noteStoreMemory } from "@hathway/notes/testing/noteStoreMemory";
import type { NoteStore } from "@hathway/notes/ports/NoteStore";

import { archiveNote, createNote, listNotes, openNote } from "./notes";

/**
 * 쪽지 유스케이스. 액션 파일이 부르는 조립을 메모리 저장소로 도커 없이 잰다.
 *
 * ⚠ 판정 규칙 자체는 `packages/notes` 가 잰다. 여기서 보는 것은 **조립이 판정을 건너뛰지 않는가**다.
 */
const run = <A>(program: Effect.Effect<A, unknown, NoteStore>) =>
    Effect.gen(function*()
    {
        const layer = yield* noteStoreMemory();

        return yield* program.pipe(Effect.provide(layer));
    });

describe("쪽지 유스케이스", () =>
{
    it.effect("쓴 쪽지는 쓴 사람의 테넌트로 서고 같은 테넌트의 목록에 오른다", () =>
        run(Effect.gen(function*()
        {
            const created = yield* createNote(customerActor("2"), { title: "회의", body: "", visibility: "tenant" });

            assert.isTrue(created.ok);

            const colleague = yield* listNotes(customerActor("3"));
            const stranger = yield* listNotes(otherCustomerActor("4"));

            assert.deepStrictEqual(colleague.map((note) => note.title), ["회의"]);
            assert.deepStrictEqual(stranger, []);
        })));

    it.effect("규칙에 걸린 입력은 저장하지 않고 칸과 문구로 답한다", () =>
        run(Effect.gen(function*()
        {
            const rejected = yield* createNote(customerActor("2"), { title: "  ", body: "", visibility: "tenant" });

            assert.deepStrictEqual(rejected.ok ? null : rejected.field, "title");
            assert.deepStrictEqual(yield* listNotes(customerActor("2")), []);
        })));

    it.effect("INV-NOTE-02 볼 수 없는 쪽지를 열면 없는 것으로 답한다", () =>
        run(Effect.gen(function*()
        {
            const created = yield* createNote(customerActor("2"), { title: "비밀", body: "", visibility: "private" });
            const noteId = created.ok ? created.noteId : "";

            assert.isNotNull(yield* openNote(customerActor("2"), noteId));
            assert.isNull(yield* openNote(customerActor("3"), noteId));
        })));

    it.effect("INV-NOTE-03 보관은 쓴 사람만 하고 다른 사람의 시도는 쪽지를 바꾸지 않는다", () =>
        run(Effect.gen(function*()
        {
            const created = yield* createNote(customerActor("2"), { title: "공유", body: "", visibility: "tenant" });
            const noteId = created.ok ? created.noteId : "";

            const refused = yield* archiveNote(customerActor("3"), { noteId, version: 1 });
            const archived = yield* archiveNote(customerActor("2"), { noteId, version: 1 });

            assert.isFalse(refused.ok);
            assert.isTrue(archived.ok);
            assert.strictEqual((yield* openNote(customerActor("2"), noteId))?.status, "archived");
        })));

    it.effect("INV-NOTE-03 연 뒤에 바뀐 쪽지는 옛 판으로 보관하지 못한다", () =>
        run(Effect.gen(function*()
        {
            const created = yield* createNote(customerActor("2"), { title: "판", body: "", visibility: "tenant" });
            const noteId = created.ok ? created.noteId : "";

            const stale = yield* archiveNote(customerActor("2"), { noteId, version: 0 });

            assert.isFalse(stale.ok);
            assert.strictEqual((yield* openNote(customerActor("2"), noteId))?.status, "active");
        })));
});

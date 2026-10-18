"use server";

import { Effect, Layer } from "effect";

import { ProductEvents } from "@/extensions/ProductEvents";
import { appAction } from "@/lib/action";
import { extensionsLayer } from "@/lib/modules";
import { noteStoreLayer } from "@/lib/notesRuntime";
import { chosenSummaryModel } from "@/lib/summaryModel";
import { summarizeNote, SummarizeInput } from "@/usecases/summary";

/**
 * 쪽지 요약. **이 파일의 export 는 전부 관문(`appAction`)을 지난 것이다.** 크레딧을 재는 일은 확장 지점
 * (`CreditMeter`)이 하고, 어느 구현이 서는지는 `lib/modules.ts` 가 정한다. 요약했으면 제품 분석에 알린다(⑥).
 */
export const summarizeNoteAction = appAction({ input: SummarizeInput }, ({ input, actor }) =>
    Effect.flatMap(Effect.all([noteStoreLayer, extensionsLayer]), ([notes, extensions]) =>
        summarizeNote(actor, input.noteId, chosenSummaryModel(), new Date()).pipe(
            Effect.tap((result) =>
                result.ok
                    ? Effect.flatMap(ProductEvents, (events) => events.capture(actor, "note_summarized", { credits: result.credits }))
                    : Effect.void),
            Effect.provide(Layer.mergeAll(notes, extensions)),
        )));

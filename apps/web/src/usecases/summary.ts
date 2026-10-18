import { generateText } from "ai";
import type { LanguageModelV4 } from "@ai-sdk/provider";
import { Effect, Schema } from "effect";

import type { Actor } from "@hathway/access/domain/Actor";
import type { NoteStore } from "@hathway/notes/ports/NoteStore";

import { CreditMeter } from "@/extensions/CreditMeter";

import { openNote } from "./notes";

/**
 * 쪽지 요약. **크레딧을 쓰는 기능의 본보기다**(2026-09-29 사용자 결정). 새 AI 기능은 이 모양을 따른다.
 *
 *   ① 볼 수 있는 쪽지인가(INV-NOTE-02). 볼 수 없으면 크레딧을 잡기 전에 멈춘다
 *   ② 확장 지점(`CreditMeter`)에 부름을 맡긴다. 결제 모듈이 있으면 크레딧을 잡고, 모자라면 부르지 않고, 쓴 토큰만큼
 *      확정한다. 모듈이 없으면 부르기만 한다
 *
 * ⚠ **요약은 적지 않는다.** 한 번 보여 주고 끝난다. 쪽지 스키마를 늘리지 않는다.
 */
export const SummarizeInput = Schema.Struct({ noteId: Schema.NonEmptyString });

export type SummarizeInput = typeof SummarizeInput.Type;

export type SummaryResult =
    | { readonly ok: true; readonly summary: string; readonly credits: number }
    | { readonly ok: false; readonly message: string; readonly upgradeHref?: string };

const SYSTEM = "쪽지를 한두 문장의 한국어 해요체로 요약한다. 첫 줄은 제목이고 나머지는 내용이다. 쪽지에 없는 말을 더하지 않는다."; // ux-writing: 모델이 읽는 지시

export const summarizeNote = (
    actor: Actor,
    noteId: string,
    model: LanguageModelV4 | string,
    now: Date,
): Effect.Effect<SummaryResult, unknown, NoteStore | CreditMeter> =>
    Effect.gen(function*()
    {
        const note = yield* openNote(actor, noteId);

        if (note === null)
        {
            return { ok: false, message: "쪽지를 찾을 수 없어요." };
        }

        const meter = yield* CreditMeter;
        const result = yield* meter.meter(actor, "note_summary", now, Effect.tryPromise(async () =>
        {
            const generated = await generateText({ model, system: SYSTEM, prompt: `${note.title}\n${note.body}` });
            const tokens = generated.usage.totalTokens ?? (generated.usage.inputTokens ?? 0) + (generated.usage.outputTokens ?? 0);

            return { value: generated.text.trim(), tokens };
        })).pipe(
            Effect.catch((cause) =>
                Effect.as(Effect.logWarning("요약하지 못했다. 잡은 크레딧은 돌려주었다").pipe(Effect.annotateLogs({ cause: String(cause) })), null)),
        );

        if (result === null)
        {
            return { ok: false, message: "요약하지 못했어요. 크레딧은 그대로예요. 잠시 뒤 다시 요약해 주세요." };
        }

        return result.ok
            ? { ok: true, summary: result.value, credits: result.credits }
            : {
                ok: false,
                message: `크레딧이 모자라요. 지금 ${result.available} 크레딧 남았어요.`,
                ...(result.topUpHref === null ? {} : { upgradeHref: result.topUpHref }),
            };
    });

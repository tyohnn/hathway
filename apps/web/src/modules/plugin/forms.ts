import { BODY_MAX, TITLE_MAX } from "@hathway/notes/rules/draft";
import type { Preferences } from "@hathway/preferences/domain/Preference";
import { VISIBILITY_VALUES } from "@hathway/preferences/rules/update";

import type { McpClient } from "@/lib/mcp";

import { noteUri, VISIBILITY_LABELS, type NoteCard } from "./views";

/**
 * 리치 폼. 도구가 돌다가 사람에게 되묻는 자리이고, 호스트가 제 모양의 폼으로 그린다.
 *
 * 표준 폼(`elicitation/create`)에 OpenAI 가 얹은 것은 넷이다. 선택지의 설명과 썸네일, 제안 값(`x-openai-suggestions`),
 * 글의 패턴, 자원 고르기(`x-openai-input`)다. 이 파일의 폼 셋이 그 넷을 한 번씩 쓴다.
 *
 * ⚠ **되묻기는 새 판의 왕복으로만 한다.** 도구가 「폼이 필요하다」로 답하고, 클라이언트가 답을 모아 같은 호출을 다시
 *    보낸다. 옛 판의 되묻기는 서버가 열린 연결로 요청을 내야 해서 요청마다 새로 도는 이 라우트와 맞지 않는다.
 * ⚠ **모르는 칸이 든 폼은 통째로 뜨지 않는다.** 그래서 표준 폼만 아는 클라이언트에는 확장 칸을 뺀 폼을 보낸다.
 * ⚠ **폼의 답은 밖에서 온 입력이다.** 선택지에 없던 값이 올 수 있다. 받는 쪽(`usecases.ts`)이 유스케이스로 다시 확인한다.
 * ⚠ **왕복 안에서 쓰는 메서드 이름은 문서로 확정하지 못했다**(2026-10-02). 스펙은 옛 판의 예만 싣고 「`elicitation/create`
 *    를 `openai/elicitation/create` 로 바꾸라」고 적는다. 그 말을 따르되, 실물 호스트에서 폼이 뜨지 않으면 `FORM_METHOD` 의
 *    `openai` 를 `elicitation/create` 로 바꿔 본다.
 */
export type FormSupport = "openai" | "standard" | "none";

const FORM_METHOD: Readonly<Record<Exclude<FormSupport, "none">, string>> = {
    openai: "openai/elicitation/create",
    standard: "elicitation/create",
};

/** 되묻는 것의 이름. 도구 하나가 폼 하나만 내므로 하나로 충분하다 */
export const FORM_KEY = "form";

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

export const formSupport = (client: McpClient): FormSupport =>
{
    if (!client.modern)
    {
        return "none";
    }

    const extensions = client.capabilities["extensions"];
    const openai = isRecord(extensions) ? extensions["openai/elicitation"] : undefined;

    if (isRecord(openai) && isRecord(openai["form"]))
    {
        return "openai";
    }

    return isRecord(client.capabilities["elicitation"]) ? "standard" : "none";
};

export interface Form
{
    readonly type: "object";
    readonly required?: ReadonlyArray<string>;
    readonly properties: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
}

export const formRequest = (support: Exclude<FormSupport, "none">, message: string, requestedSchema: Form): Record<string, unknown> => ({
    [FORM_KEY]: { method: FORM_METHOD[support], params: { mode: "form", message, requestedSchema } },
});

export type FormAnswer =
    | { readonly action: "accept"; readonly content: Readonly<Record<string, unknown>> }
    | { readonly action: "decline" | "cancel" };

/** 다시 온 호출에서 폼의 답을 꺼낸다. 없거나 모양이 틀리면 `null` 이고, 부르는 쪽이 폼을 다시 낸다 */
export const formAnswer = (inputResponses: Readonly<Record<string, unknown>> | null): FormAnswer | null =>
{
    const answer = inputResponses?.[FORM_KEY];

    if (!isRecord(answer))
    {
        return null;
    }

    if (answer["action"] === "decline" || answer["action"] === "cancel")
    {
        return { action: answer["action"] };
    }

    return answer["action"] === "accept" && isRecord(answer["content"]) ? { action: "accept", content: answer["content"] } : null;
};

/** 썸네일은 HTTPS 주소이거나 base64 데이터 주소여야 한다. 밖의 주소를 부르지 않도록 그림을 담아 보낸다 */
const thumbnail = (path: string): { readonly src: string; readonly mimeType: string } => ({
    src: `data:image/svg+xml;base64,${Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="24" fill="#f4f4f5"/><g fill="none" stroke="#52525b" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${path}</g></svg>`,
    ).toString("base64")}`,
    mimeType: "image/svg+xml",
});

const THUMBNAILS = {
    // 자물쇠: 나만 보는 쪽지
    private: thumbnail("<rect x=\"40\" y=\"58\" width=\"48\" height=\"38\" rx=\"6\"/><path d=\"M50 58v-10a14 14 0 0 1 28 0v10\"/>"),
    // 사람 둘: 조직 전체가 보는 쪽지
    tenant: thumbnail("<circle cx=\"52\" cy=\"52\" r=\"12\"/><path d=\"M30 92c2-14 12-20 22-20s20 6 22 20\"/><circle cx=\"84\" cy=\"56\" r=\"9\"/><path d=\"M82 74c10 0 16 6 18 16\"/>"),
} as const;

const excerpt = (body: string): string => ([...body].length > 80 ? `${[...body].slice(0, 80).join("")}…` : body);

/** 쪽지 하나를 고른다. 선택지의 설명과 썸네일을 쓴다 */
export const pickForm = (cards: ReadonlyArray<NoteCard>, support: FormSupport): Form => ({
    type: "object",
    required: ["note"],
    properties: {
        note: {
            type: "string",
            title: "쪽지",
            oneOf: cards.map((card) => ({
                const: card.id,
                title: card.title,
                ...(support === "openai"
                    ? { ...(card.body === "" ? {} : { description: excerpt(card.body) }), "x-openai-thumbnail": THUMBNAILS[card.visibility] }
                    : {}),
            })),
        },
    },
});

/** 새 쪽지를 받는다. 제안 값과 패턴을 쓴다. 공개 범위의 처음 값은 그 사람의 설정이다 */
export const composeForm = (preferences: Preferences, support: FormSupport): Form => ({
    type: "object",
    required: ["title"],
    properties: {
        title: {
            type: "string",
            title: "제목",
            minLength: 1,
            maxLength: TITLE_MAX,
            ...(support === "openai"
                ? {
                    // 공백만 있는 제목을 폼에서 먼저 막는다. 저장할 때 `draftNote` 가 한 번 더 본다
                    pattern: "\\S",
                    // 제안 값의 본보기다. 고르지 않고 직접 적어도 된다. 제품에서는 그 사람이 자주 쓰는 제목처럼 뜻이 있는 것을 낸다
                    "x-openai-suggestions": ["회의 메모", "할 일", "아이디어"].map((title) => ({ const: title, title })),
                }
                : {}),
        },
        body: { type: "string", title: "내용", maxLength: BODY_MAX },
        visibility: {
            type: "string",
            title: "공개 범위",
            oneOf: VISIBILITY_VALUES.map((value) => ({ const: value, title: VISIBILITY_LABELS[value] })),
            default: preferences.defaultVisibility,
        },
    },
});

/** 참고할 쪽지를 여럿 고른다. 자원 고르기와 미리 보기를 쓴다. 폼을 모르는 쪽에는 같은 주소의 여럿 고르기로 낸다 */
export const attachForm = (cards: ReadonlyArray<NoteCard>, support: FormSupport): Form => ({
    type: "object",
    required: ["notes"],
    properties: {
        notes: support === "openai"
            ? {
                type: "array",
                title: "쪽지",
                items: { type: "string", format: "uri" },
                "x-openai-input": {
                    type: "resource",
                    // 고른 것만 답에 실린다. 사용자가 제 파일을 더하는 칸(`userOptions`)은 두지 않는다. 우리가 읽을 수 없는 주소가 온다
                    selection: "explicit",
                    options: cards.map((card) => ({
                        uri: noteUri(card.id),
                        name: card.title,
                        title: card.title,
                        mimeType: "text/markdown",
                        _meta: { "openai/preview": { target: { type: "resource_link", uri: noteUri(card.id), name: card.title } } },
                    })),
                },
            }
            : {
                type: "array",
                title: "쪽지",
                items: { anyOf: cards.map((card) => ({ const: noteUri(card.id), title: card.title })) },
            },
    },
});

/**
 * 보낼 수 있는 이벤트와 그 속성의 카탈로그(INV-ANALYTICS-03). 여기 없는 이벤트는 가지 않고, 적지 않은 속성은 떨어진다.
 *
 * ⚠ **이벤트를 더하는 일은 이 파일에 줄을 더하는 커밋이다.** 속성에 사람이 쓴 글(제목 · 본문 · 이름)을 싣지 않는다.
 *    그런 키를 적으면 리뷰가 잡아야 한다.
 * ⚠ 이름은 snake_case 의 「대상_한 일」이다(`note_created`).
 */
export const EVENTS = {
    note_created: ["visibility"],
    note_archived: [],
    note_summarized: ["credits"],
} as const satisfies Record<string, ReadonlyArray<string>>;

export type EventName = keyof typeof EVENTS;

export type PropertyValue = string | number | boolean;

export type EventProperties = Readonly<Record<string, PropertyValue>>;

export const isEventName = (name: string): name is EventName => Object.hasOwn(EVENTS, name);

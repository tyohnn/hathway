/**
 * 상태·분류의 뜻.
 *
 * 어느 값이 어느 tone 인지는 온톨로지의 enum 정의가 갖고, 블록은 받은 tone 만 그린다.
 * 색은 1층 토큰(`globals.css`)이 갖고 블록은 이름만 안다 — tone 을 늘리려면 거기에
 * 진한 글자색과 옅은 바탕색 한 쌍을 먼저 만든다.
 */
export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export const TONES: ReadonlyArray<Tone> = ["neutral", "info", "success", "warning", "danger"];

/**
 * 옅은 바탕 + 진한 글자 한 쌍. 배지·칩처럼 자기 면을 가진 것이 읽는다.
 *
 * 프리미티브에 tone 변형이 없어 블록이 클래스로 덮는다. `packages/ui` 의 컴포넌트 원본을
 * 고치지 않는 것이 그 패키지의 규약이라, 색을 얹는 자리는 여기다.
 */
export const TONE_SURFACE: Record<Tone, string> = {
    neutral: "bg-muted text-muted-foreground",
    info: "bg-info-soft text-info",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-destructive-soft text-destructive",
};

/**
 * 글자와 아이콘만 색을 갖는 자리. 배너처럼 바탕이 card 인 것이 읽는다.
 * Alert 의 destructive 규칙(바탕은 card, 글자만 색)을 나머지 tone 으로 넓힌 것이다.
 */
export const TONE_TEXT: Record<Tone, string> = {
    neutral: "text-foreground",
    info: "text-info",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
};

export function isTone(value: unknown): value is Tone
{
    return typeof value === "string" && (TONES as ReadonlyArray<string>).includes(value);
}

/**
 * 왼쪽에 두르는 색 띠. 자기 면을 갖지 않는 줄이 상태를 말할 때 읽는다.
 *
 * ⚠ **neutral 은 띠를 갖지 않는다.** 모든 줄이 띠를 두르면 띠가 아무 말도 하지 않게 되고, 색이 붙은
 *    줄을 눈이 먼저 잡는다는 성질이 사라진다. 그래서 호출부가 neutral 을 넘겨도 테두리 색만 정하고
 *    두께는 주지 않는다.
 */
export const TONE_BORDER: Record<Tone, string> = {
    neutral: "border-l-border",
    info: "border-l-info",
    success: "border-l-success",
    warning: "border-l-warning",
    danger: "border-l-destructive",
};

/**
 * 색을 갖지 않은 글리프가 설 자리.
 *
 * ⚠ **글리프의 색은 아이콘마다 고정이고 그 표는 블록이 갖지 않는다.** 어느 그림이 어느 색인지는
 * 도메인의 판단이라 호출부의 아이콘 정의가 들고 다닌다. 블록이 주는 것은 색을 말하지 않고 온
 * 글리프가 설 자리 하나다 — 이것이 없으면 본문 색으로 서서 제목보다 무거워진다.
 */
export const GLYPH_COLOR = "text-muted-foreground";

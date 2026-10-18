/**
 * 서버와 화면이 함께 쓰는 작은 조각. 화면의 묶음(iframe)에도 들어가므로 **아무것도 import 하지 않는다.**
 *
 * ⚠ 여기에 서버의 것(도구 선언 · 저장소 · `node:` 모듈)을 끌어오면 그것이 통째로 화면의 묶음에 실려 호스트 안으로 나간다.
 */
export const NOTE_PREFIX = "note://";

export const noteUri = (noteId: string): string => `${NOTE_PREFIX}${noteId}`;

/** 모델과 미리 보기가 읽는 쪽지의 글 */
export const noteMarkdown = (note: { readonly title: string; readonly body: string }): string =>
    (note.body === "" ? `# ${note.title}` : `# ${note.title}\n\n${note.body}`);

/** 공개 범위를 고르는 자리의 말. 설정 · 폼 · 화면이 같은 말을 쓰고, 웹의 새 쪽지 폼과도 같다 */
export const VISIBILITY_LABELS = { private: "나만", tenant: "조직 전체" } as const;

import type { BlockKind } from "./kinds";

/**
 * 블록 편집기가 스스로 하는 말. 기본값은 한국어이고 호출부가 일부만 덮어쓴다(규약 4).
 *
 * ⚠ 수가 들어가는 말은 함수다(`dragCount`). 덮어쓸 때도 같은 모양으로 준다.
 */
export interface BlockEditorLabels
{
    /** 글을 쓰는 칸의 이름(보조 기술이 읽는다) */
    readonly content: string;
    /** 빈 줄에 흐리게 서는 안내 */
    readonly placeholder: string;
    /** 빈 제목 블록에 흐리게 서는 안내 */
    readonly headingPlaceholder: (level: number) => string;
    readonly slashMenu: string;
    readonly noMatch: string;
    readonly blockMenu: string;
    readonly moveBlock: string;
    readonly addBelow: string;
    readonly delete: string;
    readonly duplicate: string;
    readonly turnInto: string;
    /** 끄는 동안 마우스 옆에 서는 이름. 블록 하나면 그 글이고, 글이 없으면 이 말이다 */
    readonly dragFallback: string;
    readonly dragCount: (count: number) => string;
    readonly bold: string;
    readonly italic: string;
    readonly strike: string;
    readonly code: string;
    readonly link: string;
    readonly linkAddress: string;
    readonly linkApply: string;
    readonly taskDone: string;
    readonly taskOpen: string;
    readonly taskEmpty: string;
    readonly kinds: Readonly<Record<BlockKind, string>>;
    /** 「토글」 옆에 서는 풀이 */
    readonly toggleHint: string;
}

export const BLOCK_EDITOR_LABELS: BlockEditorLabels = {
    content: "내용",
    placeholder: "/를 눌러 블록 고르기",
    headingPlaceholder: (level) => `제목 ${level}`,
    slashMenu: "블록",
    noMatch: "맞는 블록이 없어요.",
    blockMenu: "블록 메뉴",
    moveBlock: "블록 옮기기",
    addBelow: "아래에 블록 넣기",
    delete: "지우기",
    duplicate: "복제",
    turnInto: "바꾸기",
    dragFallback: "블록",
    dragCount: (count) => `블록 ${count}개`,
    bold: "굵게",
    italic: "기울임",
    strike: "취소선",
    code: "코드",
    link: "링크",
    linkAddress: "링크 주소",
    linkApply: "넣기",
    taskDone: "한 일",
    taskOpen: "할 일",
    taskEmpty: "빈 항목",
    kinds: {
        paragraph: "텍스트",
        heading1: "제목 1",
        heading2: "제목 2",
        heading3: "제목 3",
        bulletList: "글머리 목록",
        orderedList: "번호 목록",
        taskList: "할 일 목록",
        toggle: "토글",
        callout: "콜아웃",
        quote: "인용",
        code: "코드",
        divider: "구분선",
    },
    toggleHint: "접고 펴기",
};

/** 호출부가 준 일부를 기본값 위에 얹는다. 종류 이름은 종류마다 얹는다 */
export const blockEditorLabels = (over: Partial<BlockEditorLabels> = {}): BlockEditorLabels => ({
    ...BLOCK_EDITOR_LABELS,
    ...over,
    kinds: { ...BLOCK_EDITOR_LABELS.kinds, ...over.kinds },
});

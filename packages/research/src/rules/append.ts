import type { Group, Widget } from "../domain/Board.ts";

/**
 * 대화에서 정리한 글 한 장을 보드에 담는다. 플러그인의 `save_to_board` 가 부른다.
 *
 * ⚠ **식별자를 스스로 만들지 않는다.** 받은 `newId` 에서 온다(`draft.ts` 와 같은 까닭).
 * ⚠ 담을 수 있는지(테넌트 · 판 · 한도)는 여기서 보지 않는다. 부르는 쪽이 `editVerdict` 와 `limitVerdict` 를 지난다.
 */
export interface NoteToAppend
{
    /** 노트가 들어갈 그룹. 보통 종목 이름이다 */
    readonly groupTitle: string;
    readonly title: string;
    readonly body: string;
}

/** 빈 보드가 처음 갖는 그룹의 제목(`draft.ts`). 비어 있으면 담는 노트의 그룹이 그 자리를 넘겨받는다 */
const BLANK_GROUP = "새 그룹";

const NOTE_SIZE = { w: 6, h: 4, minW: 3, minH: 3 } as const;

const GROUP_SIZE = { w: 6, h: 10, minW: 4 } as const;

/** 그룹의 아래 여백. 화면이 그룹 머리와 바닥에 쓰는 줄이다 */
const GROUP_PADDING = 2;

const bottomOf = (layouts: ReadonlyArray<{ readonly y: number; readonly h: number }>): number =>
    layouts.reduce((max, layout) => Math.max(max, layout.y + layout.h), 0);

const withWidget = (group: Group, widget: Omit<Widget, "layout">): Group =>
{
    const y = bottomOf(group.widgets.map((each) => each.layout));
    const added: Widget = { ...widget, layout: { i: widget.id, x: 0, y, ...NOTE_SIZE } };

    return {
        ...group,
        widgets: [...group.widgets, added],
        layout: { ...group.layout, h: Math.max(group.layout.h, y + NOTE_SIZE.h + GROUP_PADDING) },
    };
};

export const appendNote = (
    groups: ReadonlyArray<Group>,
    note: NoteToAppend,
    newId: (prefix: string) => string,
): ReadonlyArray<Group> =>
{
    const widget = { id: newId("note"), kind: "note" as const, title: note.title, body: note.body };
    const target = groups.findIndex((group) => group.title === note.groupTitle);
    const blank = groups.findIndex((group) => group.title === BLANK_GROUP && group.widgets.length === 0);

    if (target >= 0)
    {
        return groups.map((group, at) => (at === target ? withWidget(group, widget) : group));
    }

    if (blank >= 0)
    {
        return groups.map((group, at) => (at === blank ? withWidget({ ...group, title: note.groupTitle }, widget) : group));
    }

    const id = newId("group");
    const fresh: Group = {
        id,
        title: note.groupTitle,
        summary: "",
        layout: { i: id, x: 0, y: bottomOf(groups.map((group) => group.layout)), ...GROUP_SIZE },
        widgets: [],
    };

    return [...groups, withWidget(fresh, widget)];
};

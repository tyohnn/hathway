import { Schema } from "effect";

/**
 * 리서치 보드. 주제마다 그룹을 두고 그 안에 차트 · 뉴스 · 메모 칸을 모은 문서 하나다.
 *
 * ⚠ **문서의 모양을 여기서 정한다(INV-RESEARCH-05).** 보드의 본문은 표의 `document` 칸(jsonb) 하나에 통째로
 *    들어가므로 데이터베이스가 그 안을 막아 주지 못한다. 저장으로 들어오는 값은 이 스키마를 지난 것만 닿는다.
 * ⚠ **`bigint` 인 id 는 문자열로 다닌다.** `pg` 가 `bigint` 를 문자열로 돌려준다.
 */
export const BoardTheme = Schema.Literals(["stocks", "real-estate"]);

export type BoardTheme = typeof BoardTheme.Type;

export const WidgetKind = Schema.Literals(["chart", "news", "note", "metric", "link"]);

export type WidgetKind = typeof WidgetKind.Type;

/**
 * 꼴의 한도. 화면에서는 나올 수 없는 값이라 넘으면 무엇이 틀렸는지 알려 주지 않고 통째로 거절한다.
 * 쓴 사람이 고칠 수 있는 한도(제목 · 본문의 길이, 그룹 · 칸의 수, 링크의 모양)는 여기가 아니라 `rules/limits.ts` 가
 * 갖고 무엇을 넘었는지 알려 준다.
 */
const Id = Schema.String.check(Schema.isMinLength(1), Schema.isMaxLength(64));

/** 경로와 지우는 조건에 그대로 들어간다. 소문자 · 숫자 · 하이픈 64자까지 */
export const BoardSlug = Schema.String.check(Schema.isPattern(/^[a-z0-9][a-z0-9-]{0,63}$/));

/** 격자의 좌표와 크기. 1e308 같은 값은 캔버스를 깨뜨린다 */
const Grid = Schema.Int.check(Schema.isBetween({ minimum: 0, maximum: 10000 }));

const text = (limit: number) => Schema.String.check(Schema.isMaxLength(limit));

/** 격자 위의 자리. 그룹과 칸이 같은 모양을 쓴다 */
export const Layout = Schema.Struct({
    i: Id,
    x: Grid,
    y: Grid,
    w: Grid,
    h: Grid,
    minW: Schema.optional(Grid),
    minH: Schema.optional(Grid),
    maxH: Schema.optional(Grid),
});

export type Layout = typeof Layout.Type;

export const Widget = Schema.Struct({
    id: Id,
    kind: WidgetKind,
    title: Schema.String,
    layout: Layout,
    body: Schema.optional(Schema.String),
    source: Schema.optional(text(300)),
    href: Schema.optional(text(2048)),
    hrefLabel: Schema.optional(text(120)),
    items: Schema.optional(Schema.Array(Schema.Struct({
        title: text(300),
        href: Schema.optional(text(2048)),
        note: Schema.optional(text(1000)),
    })).check(Schema.isMaxLength(50))),
    metric: Schema.optional(Schema.Struct({ value: text(120), caption: text(300) })),
});

export type Widget = typeof Widget.Type;

export const Group = Schema.Struct({
    id: Id,
    title: Schema.String,
    summary: text(1000),
    layout: Layout,
    widgets: Schema.Array(Widget),
});

export type Group = typeof Group.Type;

/** 표의 `document` 칸에 들어가는 모양 */
export const BoardDocument = Schema.Struct({
    groups: Schema.Array(Group),
});

export type BoardDocument = typeof BoardDocument.Type;

export const Board = Schema.Struct({
    slug: BoardSlug,
    /** 이 보드를 가진 테넌트. 고치고 지우는 판정이 이것을 본다(INV-RESEARCH-02) */
    tenantId: Schema.NonEmptyString,
    /** 만든 사람. 규칙을 들이기 전에 만든 보드에는 없다 */
    createdBy: Schema.NullOr(Schema.NonEmptyString),
    theme: BoardTheme,
    title: Schema.String,
    tagline: Schema.String,
    relatedStockCode: Schema.optional(text(20)),
    relatedIndustrySlug: Schema.optional(text(100)),
    groups: Schema.Array(Group),
    /** 고칠 때마다 하나씩 는다. 저장이 열었을 때의 판을 들고 와 대조한다(INV-RESEARCH-03) */
    version: Schema.Number,
});

export type Board = typeof Board.Type;

/** 새로 만들 보드. 판정(`rules/draft.ts`)을 지난 값만 이 모양이 된다 */
export type NewBoard = Omit<Board, "version">;

/** 저장이 바꾸는 칸. 테넌트 · 만든 사람 · slug · 테마는 바뀌지 않는다 */
export interface BoardChange
{
    readonly title: string;
    readonly tagline: string;
    readonly groups: ReadonlyArray<Group>;
}

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

/** 격자 위의 자리. 그룹과 칸이 같은 모양을 쓴다 */
export const Layout = Schema.Struct({
    i: Schema.String,
    x: Schema.Finite,
    y: Schema.Finite,
    w: Schema.Finite,
    h: Schema.Finite,
    minW: Schema.optionalKey(Schema.Finite),
    minH: Schema.optionalKey(Schema.Finite),
    maxH: Schema.optionalKey(Schema.Finite),
});

export type Layout = typeof Layout.Type;

export const Widget = Schema.Struct({
    id: Schema.String,
    kind: WidgetKind,
    title: Schema.String,
    layout: Layout,
    body: Schema.optionalKey(Schema.String),
    source: Schema.optionalKey(Schema.String),
    href: Schema.optionalKey(Schema.String),
    hrefLabel: Schema.optionalKey(Schema.String),
    items: Schema.optionalKey(Schema.Array(Schema.Struct({
        title: Schema.String,
        href: Schema.optionalKey(Schema.String),
        note: Schema.optionalKey(Schema.String),
    }))),
    metric: Schema.optionalKey(Schema.Struct({ value: Schema.String, caption: Schema.String })),
});

export type Widget = typeof Widget.Type;

export const Group = Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    summary: Schema.String,
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
    slug: Schema.NonEmptyString,
    /** 이 보드를 가진 테넌트. 고치고 지우는 판정이 이것을 본다(INV-RESEARCH-02) */
    tenantId: Schema.NonEmptyString,
    /** 만든 사람. 규칙을 들이기 전에 만든 보드에는 없다 */
    createdBy: Schema.NullOr(Schema.NonEmptyString),
    theme: BoardTheme,
    title: Schema.String,
    tagline: Schema.String,
    relatedStockCode: Schema.optionalKey(Schema.String),
    relatedIndustrySlug: Schema.optionalKey(Schema.String),
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

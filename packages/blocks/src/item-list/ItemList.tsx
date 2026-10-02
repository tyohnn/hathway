"use client";

import { Fragment } from "react";

import { Empty, EmptyDescription, EmptyHeader } from "@investment/ui/components/empty";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemGroup,
    ItemMedia,
    ItemSeparator,
    ItemTitle,
} from "@investment/ui/components/item";
import { ChevronRight } from "@investment/ui/icons";
import { cn } from "@investment/ui/lib/utils";

import { isInteractiveTarget } from "../interaction";
import { PendingText } from "../pending";
import { GLYPH_COLOR, TONE_BORDER } from "../tone";
import { ITEM_LIST_LABELS } from "./labels";
import type { ItemListProps, ListItem } from "./types";

/**
 * 표가 아닌 카드·행 목록.
 *
 * 열이 둘 이하이고 행마다 설명이 붙으면 표가 아니라 목록이다. 행의 미디어·제목·설명·액션은
 * Item 조각 그대로이고, 블록은 나열과 구분, 그리고 「항목을 눌렀다」의 뜻만 맡는다.
 * 안쪽 버튼을 누른 것은 항목 누르기로 치지 않는다(DataTable 의 행 규칙과 같다).
 *
 * ⚠ 누를 수 있는 항목에는 `aria-label` 로 제목만 이름으로 준다. 기본 이름은 자식 글자를 다 모으는데,
 * 안쪽에 버튼이 있으면 그 글자까지 항목 이름에 섞여 「열기」로도 항목이 잡힌다(2026-09-06 e2e 에서 확인).
 *
 * ⚠ **누를 수 있으면 셰브런을 블록이 그린다.** 줄 전체가 과녁인데 그 사실이 보이지 않으면 사람이 제목만
 * 겨냥한다. 호출부가 `actions` 에 손으로 넣으면 화면마다 크기와 색이 갈라지고, 누를 수 없는 줄에도
 * 들어가는 날이 온다. 눌러서 무엇이 열리는가는 화면의 몫이고 「눌린다」는 사실은 블록의 몫이다.
 *
 * ⚠ **기다리는 얼굴은 이 블록의 `loading` 이다.** 따로 그린 뼈대는 줄 높이 · 구분선 · 여백이 달라 값이 오는 순간
 * 화면이 움직인다. 같은 `Item` 에 값 자리만 막대(`PendingText`)로 바꿔 세운다.
 */
export function ItemList({
    items,
    appearance = "divided",
    density = "default",
    selectedId,
    onItemPress,
    empty,
    labels,
    loading = false,
    loadingRows = 3,
    className,
}: ItemListProps)
{
    const text = { ...ITEM_LIST_LABELS, ...labels };

    if (loading)
    {
        return (
            <ItemGroup
                data-slot="item-list"
                data-appearance={appearance}
                data-loading
                aria-busy
                className={cn(appearance === "card" ? "gap-[var(--surface-gap)]" : "", appearance === "divided" ? "gap-0" : "", className)}
            >
                {Array.from({ length: loadingRows }, (_, index) => (
                    <Fragment key={index}>
                        <Item variant={appearance === "card" ? "outline" : "default"} size={density === "compact" ? "sm" : "default"}>
                            <ItemContent>
                                <ItemTitle><PendingText length={10} /></ItemTitle>
                                <ItemDescription><PendingText length={18} /></ItemDescription>
                            </ItemContent>
                        </Item>
                        {appearance === "divided" && index < loadingRows - 1 ? <ItemSeparator /> : null}
                    </Fragment>
                ))}
            </ItemGroup>
        );
    }

    if (items.length === 0)
    {
        return (
            <div data-slot="item-list" data-empty className={className}>
                {empty ?? (
                    <Empty>
                        <EmptyHeader>
                            <EmptyDescription>{text.empty}</EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                )}
            </div>
        );
    }

    const press = (item: ListItem) => (event: React.MouseEvent | React.KeyboardEvent) =>
    {
        if (onItemPress === undefined || item.disabled === true || isInteractiveTarget(event.target))
        {
            return;
        }

        if (event.type === "keydown")
        {
            const key = (event as React.KeyboardEvent).key;

            if (key !== "Enter" && key !== " ")
            {
                return;
            }

            event.preventDefault();
        }

        onItemPress(item);
    };

    return (
        <ItemGroup
            data-slot="item-list"
            data-appearance={appearance}
            className={cn(
                appearance === "card" ? "gap-[var(--surface-gap)]" : "",
                // ⚠ **divided 는 사이 간격을 갖지 않는다.** 나누는 일은 구분선이 맡는다. 간격까지 두면 한 번
                //    나눌 것을 두 번 나누게 되어 줄 사이가 벌어지고, 훑으라고 만든 목록이 훑어지지 않는다.
                //    항목 사이를 띄우는 것은 card 의 성질이다.
                appearance === "divided" ? "gap-0" : "",
                className,
            )}
        >
            {items.map((item, index) => (
                <Fragment key={item.id}>
                    <Item
                        variant={appearance === "card" ? "outline" : "default"}
                        size={density === "compact" ? "sm" : "default"}
                        data-tone={item.tone ?? "neutral"}
                        data-selected={item.id === selectedId ? "" : undefined}
                        data-disabled={item.disabled === true ? "" : undefined}
                        aria-disabled={item.disabled === true ? true : undefined}
                        role={onItemPress === undefined ? undefined : "button"}
                        aria-label={onItemPress === undefined ? undefined : item.title}
                        tabIndex={onItemPress === undefined || item.disabled === true ? undefined : 0}
                        onClick={onItemPress === undefined ? undefined : press(item)}
                        onKeyDown={onItemPress === undefined ? undefined : press(item)}
                        className={cn(
                            // ⚠ **tone 은 왼쪽 띠로 선다.** 줄 전체를 물들이면 목록을 훑는 눈이 글자보다 바탕을
                            //    먼저 읽고, 배지가 이미 그 자리에 있으면 같은 말이 두 번 선다. 띠는 곁눈으로만
                            //    걸린다. neutral 은 띠를 두르지 않는다. 모두가 두르면 아무 말도 하지 않는다.
                            item.tone === undefined || item.tone === "neutral" ? "" : cn("border-l-2", TONE_BORDER[item.tone]),
                            item.id === selectedId ? "bg-accent" : "",
                            item.disabled === true ? "opacity-50" : "",
                            onItemPress === undefined || item.disabled === true ? "" : "cursor-pointer hover:bg-accent",
                        )}
                    >
                        {item.media === undefined
                            ? null
                            : (
                                // ⚠ **글리프의 크기는 프리미티브가 정한다.** `icon` 변형이 3층의
                                //    `--item-media-icon-size` 를 읽으므로 블록이 값을 고르지 않는다. default 변형은
                                //    크기를 정하지 않아, 호출부가 아이콘을 그대로 넘기면 본래 크기인 24px 로 선다.
                                //    색은 블록 사이에 고정된 한 값이다(`tone.ts` 의 GLYPH_COLOR).
                                <ItemMedia variant="icon" className={GLYPH_COLOR}>{item.media}</ItemMedia>
                            )}
                        <ItemContent>
                            <ItemTitle>{item.title}</ItemTitle>
                            {item.description === undefined ? null : <ItemDescription>{item.description}</ItemDescription>}
                        </ItemContent>
                        {item.meta === undefined && item.actions === undefined && onItemPress === undefined
                            ? null
                            : (
                                <ItemActions>
                                    {item.meta === undefined
                                        ? null
                                        : (
                                            <span className="text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] text-muted-foreground">
                                                {item.meta}
                                            </span>
                                        )}
                                    {item.actions}
                                    {onItemPress === undefined || item.disabled === true
                                        ? null
                                        : <ChevronRight className="size-4 text-muted-foreground" aria-hidden />}
                                </ItemActions>
                            )}
                    </Item>
                    {/* ⚠ 여백을 0으로 덮지 않는다. 3층이 구분선에 `margin-block: var(--item-gap)` 을 주어 두었고,
                        그것을 지우면 칠해진 줄의 둥근 모서리와 곧게 그어진 선이 맞닿아 겹쳐 보인다(2026-09-22 실측).
                        묶음의 간격(gap-0)은 그대로 두므로 줄 사이를 벌리는 것은 이 여백 하나다. */}
                    {appearance === "divided" && index < items.length - 1 ? <ItemSeparator /> : null}
                </Fragment>
            ))}
        </ItemGroup>
    );
}

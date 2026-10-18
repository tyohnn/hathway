"use client";

import React from "react";

import { Badge } from "@hathway/ui/components/badge";
import { ChevronRight, Image } from "@hathway/ui/icons";
import { cn } from "@hathway/ui/lib/utils";

import { PendingText } from "../pending";
import { SectionHeader } from "../section-header";
import { TONE_SURFACE } from "../tone";
import { GALLERY_LABELS } from "./labels";
import type { GalleryItem, GallerySectionProps, GalleryTile } from "./types";

/** 한 줄의 카드 수. 넓은 화면 넷 · 좁은 화면 둘이고, 기다리는 얼굴도 그만큼 선다 */
const DEFAULT_LOADING_COUNT = 4;

/**
 * 갤러리 홈의 묶음 하나. 제목과 「모두 보기」 가 선 머리 아래에 그림 카드가 줄지어 선다(Figma Community · v0 의 템플릿 홈).
 *
 * ⚠ **기다리는 얼굴은 `loading` 이다.** 그림 칸의 비율과 제목 두 줄 · 보조 한 줄의 높이가 값이 온 카드와 같아서, 값이 와도 아래 묶음이
 *    밀리지 않는다. 제목 칸은 늘 두 줄 높이로 서므로 짧은 제목과 긴 제목이 한 줄에 섞여도 카드 높이가 같다.
 * ⚠ **카드 전체가 링크 하나다.** 링크의 이름은 제목만이다. 보조 한 줄 · 배지는 보이는 글이지만 이름에 섞지 않는다.
 * ⚠ **링크 요소(`render` · `more`)는 클라이언트 컴포넌트에서 만들어 넘긴다.** 서버 컴포넌트가 만든 `<Link />` 를 넘기면 블록이 그것을
 *    고쳐 그리는 자리에서 요소의 종류가 비어 화면이 통째로 떨어진다(2026-10-17 실측, React #130). 앱 셸의 `brand.render` 와 같다.
 */
export function GallerySection(props: GallerySectionProps)
{
    const labels = { ...GALLERY_LABELS, ...props.labels };
    const more = props.more === undefined
        ? undefined
        : React.cloneElement(props.more, {
            "aria-label": labels.moreName(props.title),
            className: "inline-flex items-center gap-1 text-[length:var(--ui-text-sm)] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline",
            children: (
                <>
                    {labels.more}
                    <ChevronRight aria-hidden className="size-4" />
                </>
            ),
        });

    return (
        <section
            data-slot="gallery-section"
            aria-label={props.title}
            aria-busy={"loading" in props && props.loading === true ? true : undefined}
            className={cn("flex flex-col gap-[var(--surface-gap-lg)]", props.className)}
        >
            <SectionHeader title={props.title} {...(more === undefined ? {} : { actions: more })} />
            {props.appearance === "tiles"
                ? (
                    <div className="grid gap-[var(--surface-gap-lg)] sm:grid-cols-2 lg:grid-cols-4">
                        {props.tiles.map((tile) => <Tile key={tile.id} tile={tile} />)}
                    </div>
                )
                : (
                    <div className="grid grid-cols-2 gap-x-[var(--surface-gap-lg)] gap-y-6 md:grid-cols-4">
                        {props.loading === true
                            ? Array.from({ length: props.loadingCount ?? DEFAULT_LOADING_COUNT }, (_, index) => <Card key={index} item={null} />)
                            : props.items.map((item) => <Card key={item.id} item={item} />)}
                    </div>
                )}
        </section>
    );
}

function Card({ item }: { readonly item: GalleryItem | null })
{
    const body = (
        <>
            <span className="relative block aspect-[4/3] overflow-hidden rounded-[var(--card-radius,var(--radius))] border border-border bg-muted">
                {item?.image === undefined || item.image === null
                    ? <EmptyFrame />
                    : <img src={item.image} alt="" loading="lazy" className="size-full object-cover object-top transition-transform group-hover:scale-[1.02]" />}
                {item?.badge === undefined
                    ? null
                    : (
                        <Badge className={cn("absolute top-2 left-2", TONE_SURFACE[item.badgeTone ?? "neutral"])}>
                            {item.badge}
                        </Badge>
                    )}
            </span>
            <span className="mt-2 line-clamp-2 min-h-[calc(2*var(--ui-line-height-md))] text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)] text-foreground" style={{ fontWeight: "var(--ui-font-weight)" }}>
                {item === null ? <PendingText length={12} /> : item.title}
            </span>
            <span className="block truncate text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] text-muted-foreground">
                {item === null ? <PendingText length={8} /> : (item.meta ?? " ")}
            </span>
        </>
    );

    if (item === null)
    {
        return <div data-loading className="flex flex-col">{body}</div>;
    }

    return React.cloneElement(item.render, {
        "aria-label": item.title,
        className: "group flex min-w-0 flex-col rounded-[var(--card-radius,var(--radius))] outline-offset-4",
        children: body,
    });
}

/** 그림이 없는 카드의 그림 칸. 읽는 사람에게는 없는 것이다. 제목은 바로 아래에 있다 */
function EmptyFrame()
{
    return (
        <span aria-hidden className="flex size-full items-center justify-center text-muted-foreground/60">
            <Image className="size-6" />
        </span>
    );
}

function Tile({ tile }: { readonly tile: GalleryTile })
{
    const images = tile.images.slice(0, 3);

    return React.cloneElement(tile.render, {
        "aria-label": tile.title,
        className: "group relative flex h-40 flex-col justify-between overflow-hidden rounded-[var(--card-radius,var(--radius))] border border-border bg-muted p-[var(--surface-padding-md,1rem)]",
        children: (
            <>
                <span className="relative z-10 flex flex-col">
                    <span className="text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)] text-foreground" style={{ fontWeight: "var(--ui-font-weight)" }}>
                        {tile.title}
                    </span>
                    {tile.meta === undefined
                        ? null
                        : <span className="text-[length:var(--ui-text-sm)] leading-[var(--ui-line-height-sm)] text-muted-foreground">{tile.meta}</span>}
                </span>
                <span aria-hidden className="absolute right-4 -bottom-6 flex">
                    {images.map((src, index) => (
                        <img
                            key={index}
                            src={src}
                            alt=""
                            loading="lazy"
                            className="h-28 w-24 rounded-md border border-border bg-card object-cover object-top shadow-sm transition-transform group-hover:-translate-y-1"
                            style={{ marginLeft: index === 0 ? 0 : "-2.5rem", rotate: `${(index - (images.length - 1) / 2) * 8}deg` }}
                        />
                    ))}
                </span>
            </>
        ),
    });
}

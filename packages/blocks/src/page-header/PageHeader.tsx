"use client";

import { Fragment } from "react";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@investment/ui/components/breadcrumb";
import { cn } from "@investment/ui/lib/utils";

import { PendingText } from "../pending";
import type { PageHeaderProps } from "./types";

/**
 * 라우트의 머리. 브레드크럼 · 제목 · 설명 · 액션을 한 규격으로 놓는다.
 *
 * 제목 크기는 2층 heading 축의 lg 다. Tailwind 의 `font-[…]` 는 굵기와 글꼴을 구분하지 못해
 * 굵기만 style 로 준다 — 나머지 값은 className 이라 호출부가 덮어쓸 수 있다.
 */
export function PageHeader({ title, loading, description, breadcrumb, actions, className }: PageHeaderProps)
{
    return (
        <header
            data-slot="page-header"
            data-loading={loading === true ? "" : undefined}
            aria-busy={loading === true ? true : undefined}
            className={cn("flex flex-col gap-[var(--surface-gap-lg)]", className)}
        >
            {breadcrumb === undefined || breadcrumb.length === 0
                ? null
                : (
                    <Breadcrumb aria-label="현재 위치">
                        <BreadcrumbList>
                            {breadcrumb.map((crumb, index) =>
                            {
                                const isLast = index === breadcrumb.length - 1;

                                return (
                                    <Fragment key={`${index}-${crumb.label}`}>
                                        <BreadcrumbItem>
                                            {isLast || crumb.href === undefined
                                                ? <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                                                : <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>}
                                        </BreadcrumbItem>
                                        {isLast ? null : <BreadcrumbSeparator />}
                                    </Fragment>
                                );
                            })}
                        </BreadcrumbList>
                    </Breadcrumb>
                )}

            <div className="flex flex-wrap items-start justify-between gap-[var(--surface-gap-lg)]">
                <div className="flex min-w-0 flex-col gap-[var(--surface-gap)]">
                    <h1
                        className="text-[length:var(--heading-font-size-lg)] leading-[var(--heading-line-height-lg)] tracking-[var(--heading-letter-spacing)] text-foreground"
                        style={{ fontWeight: "var(--ui-font-weight)" }}
                    >
                        {loading === true ? <PendingText length={8} /> : title}
                    </h1>
                    {description === undefined
                        ? null
                        : (
                            <p className="text-[length:var(--ui-text-md)] leading-[var(--ui-line-height-md)] text-muted-foreground">
                                {description}
                            </p>
                        )}
                </div>
                {actions === undefined
                    ? null
                    : <div className="flex shrink-0 items-center gap-[var(--control-gap-sm)]">{actions}</div>}
            </div>
        </header>
    );
}

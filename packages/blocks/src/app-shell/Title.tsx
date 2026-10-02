"use client";

import { Fragment } from "react";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@investment/ui/components/breadcrumb";

import { activeTrail } from "./active";
import { APP_SHELL_LABELS } from "./labels";
import type { AppShellTitleProps } from "./types";

/**
 * 상단 띠의 현재 위치 한 줄.
 *
 * ⚠ `AppShellNav` 와 같은 이유로 `<Suspense>` 안쪽이다. 기다리는 동안에는 기본 문구가 서고, 주소가
 *    오면 그 자리만 바뀐다 — 띠의 높이가 같아 본문이 밀리지 않는다.
 *
 * ⚠ **묶음 안의 자리는 지나온 길을 함께 적는다.** 사이드바에서 아래 항목은 그 묶음에 서 있을 때만
 *    펴지므로, 띠에 마지막 이름만 적으면 사람이 어디 안에 있는지를 사이드바에서만 읽게 된다.
 */
export function AppShellTitle({ groups, pathname, labels }: AppShellTitleProps)
{
    const text = { ...APP_SHELL_LABELS, ...labels };
    const trail = activeTrail(groups, pathname);

    return (
        <Breadcrumb aria-label="현재 위치">
            <BreadcrumbList>
                {trail.length === 0
                    ? (
                        <BreadcrumbItem>
                            <BreadcrumbPage>{text.fallbackTitle}</BreadcrumbPage>
                        </BreadcrumbItem>
                    )
                    : trail.map((item, index) => (
                        <Fragment key={item.base}>
                            {index === 0 ? null : <BreadcrumbSeparator />}
                            <BreadcrumbItem>
                                <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            </BreadcrumbItem>
                        </Fragment>
                    ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}

import type { ReactNode } from "react";

import { PendingText } from "@hathway/blocks/pending";
import { Avatar, AvatarFallback } from "@hathway/ui/components/avatar";
import { cn } from "@hathway/ui/lib/utils";

import { avatarTone, initialOf } from "./avatar";

import "./settings.css";

interface PersonAvatarProps
{
    /** 머리글자를 떼는 이름. 이름이 없으면 이메일을 넘긴다 */
    readonly name?: string;
    /** 색조를 고르는 열쇠. 이메일을 넘긴다(`avatarTone`) */
    readonly toneKey?: string;
    /** `xl` 은 내 계정의 머리에 서는 큰 얼굴이다 */
    readonly size?: "default" | "xl";
    readonly loading?: boolean;
}

/**
 * 사진 대신 머리글자를 적는 얼굴. 명부에는 사진이 없다.
 *
 * ⚠ 머리글자는 읽는 사람에게 없는 것이다(`aria-hidden`). 옆에 이름이 서므로 스크린리더가 「김 김고객」으로 읽지 않게 한다.
 * ⚠ `loading` 은 같은 크기의 빈 얼굴이다. 색조는 누구인지 알아야 고르므로 그때는 시스템의 기본 바탕이다.
 */
export function PersonAvatar({ name = "", toneKey = "", size = "default", loading = false }: PersonAvatarProps)
{
    return (
        <Avatar className={cn(size === "xl" ? "st-avatar-xl" : undefined)}>
            {loading
                ? <AvatarFallback aria-hidden>{" "}</AvatarFallback>
                : <AvatarFallback aria-hidden data-tone={avatarTone(toneKey)}>{initialOf(name)}</AvatarFallback>}
        </Avatar>
    );
}

interface PersonCellProps
{
    /** 보이는 이름. 이름이 없는 사람은 이메일이 이 자리에 선다 */
    readonly name?: string;
    /** 머리글자를 떼는 글. 주지 않으면 `name` 에서 뗀다. 이름 뒤에 「(나)」 같은 말을 붙였을 때 쓴다 */
    readonly initialFrom?: string;
    readonly toneKey?: string;
    /** 이름 아래 흐린 한 줄. 이메일 */
    readonly meta?: string;
    /** 이름 옆에 서는 배지 */
    readonly badges?: ReactNode;
    readonly loading?: boolean;
}

/**
 * 표의 한 칸에 서는 사람. 얼굴과 이름이 나란히 서고, `meta` 가 있으면 이름 아래에 흐린 줄이 하나 더 선다.
 *
 * ⚠ **이름은 제 요소 하나에 선다.** 배지와 한 요소에 섞으면 글자로 사람을 찾는 쪽(e2e · 브라우저의 찾기)이 이름과 배지를
 *    이어 붙인 글을 받는다.
 * ⚠ `loading` 은 같은 틀에서 빈 얼굴과 막대 두 줄이다. 값이 오면 줄 수가 같아 줄 높이가 움직이지 않는다.
 */
export function PersonCell({ name = "", initialFrom, toneKey, meta, badges, loading = false }: PersonCellProps)
{
    return (
        <div className="flex items-center gap-3">
            <PersonAvatar name={initialFrom ?? name} {...(toneKey === undefined ? {} : { toneKey })} loading={loading} />
            <div className="flex min-w-0 flex-col">
                <span className="flex items-center gap-2">
                    {loading ? <PendingText length={3} /> : <span className="st-truncate">{name}</span>}
                    {loading ? null : badges}
                </span>
                {loading
                    ? <span className="st-meta"><PendingText length={14} /></span>
                    : meta === undefined ? null : <span className="st-meta st-truncate">{meta}</span>}
            </div>
        </div>
    );
}

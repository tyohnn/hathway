import { Button } from "@investment/ui/components/button";

import { PendingText } from "../pending";
import { APP_SHELL_LABELS } from "./labels";
import type { AppShellAccountProps, AppShellLabels } from "./types";

/**
 * 사이드바 발치 — 지금 누구로 들어와 있는가.
 *
 * ⚠ **세션을 여기서 읽지 않는다.** 블록은 데이터를 가져오지 않으므로 앱이 읽어 `email` 로 넘기고,
 *    그 조각을 `<Suspense>` 안쪽에 두는 것도 앱이 한다 — 이 한 줄 때문에 사이드바 전체가 늦게 오면 안 된다.
 *
 * ⚠ **이름이 있으면 이름을, 없으면 이메일을 적는다.** 이름은 사람이 내 계정에서 정한 값이고(2026-09-29),
 *    처음 초대된 사람에게는 아직 없다. 앱이 읽어 `name` 으로 넘긴다.
 *
 * ⚠ **권한 축을 화면에 적지 않는다.** 사람이 자기 계정을 알아보는 데 필요한 것은 이메일 하나다.
 *    `org` 은 어느 조직으로 들어와 있는지를 적는 한 줄이지 등급이 아니다.
 *
 * ⚠ **기다리는 얼굴은 `loading` 이다.** 같은 줄에 이름 자리만 막대이고 단추는 꺼진 채 같은 자리에 선다. 값이 와도
 *    사이드바 발치가 움직이지 않는다.
 */
export function AppShellAccount(props: AppShellAccountProps)
{
    const text: AppShellLabels = { ...APP_SHELL_LABELS, ...props.labels };

    if (props.loading === true)
    {
        return (
            <div aria-busy className="flex items-center gap-2 px-1">
                <span aria-hidden className="bg-muted flex size-6 shrink-0 rounded-full" />
                <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[13px] leading-[18px] font-medium"><PendingText length={6} /></span>
                </span>
                <Button className="ml-auto" disabled size="xs" type="button" variant="ghost">{text.signOut}</Button>
            </div>
        );
    }

    const { email, name, org, onSignOut } = props;
    const shown = name === undefined || name === "" ? email : name;

    return (
        <div className="flex items-center gap-2 px-1">
            <span aria-hidden className="bg-muted text-muted-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
                {shown.slice(0, 1).toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-col">
                <span className="truncate text-[13px] leading-[18px] font-medium">{shown}</span>
                {org === undefined ? null : <span className="text-muted-foreground text-xs leading-4">{org}</span>}
            </span>
            <form action={onSignOut} className="ml-auto">
                <Button type="submit" variant="ghost" size="xs">{text.signOut}</Button>
            </form>
        </div>
    );
}

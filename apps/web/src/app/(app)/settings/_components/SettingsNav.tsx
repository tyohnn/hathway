"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@hathway/ui/lib/utils";

import { BILLABLE_SETTINGS, SETTINGS } from "../../_components/navGroups";

/**
 * 설정의 옆 메뉴. 사이드바에는 「설정」 한 줄만 있고, 들어오면 이 메뉴가 개인 → 조직 → 결제 갈래로 선다
 * (`/ia-design` 의 대시보드 해부도 7번). 항목은 메뉴의 정본(`lib/paths.ts` · 모듈의 `nav.ts`)에서 `place: "settings"` 인 것이다.
 *
 * ⚠ **지금 주소를 읽는 조각(`SettingsNav`)과 그리는 조각(`SettingsNavView`)을 나눈다.** 주소는 요청 시점 값이라 `<Suspense>` 안에서만 읽고,
 *    기다리는 동안에는 같은 목록이 아무것도 켜지지 않은 채 선다(셸의 사이드바와 같은 규칙). 폭과 줄 수가 같아 화면이 흔들리지 않는다.
 * ⚠ 결제하는 조직인지는 행위자를 읽은 서버 조각(`settings/layout.tsx` 의 `ActorSettingsNav`)이 알려 준다. 기다리는 동안에는 결제하지 않는
 *    조직의 목록이 선다. 「요금제」가 떴다가 사라지는 것보다 한 줄이 늦게 서는 편이 덜 흔들린다.
 */
export function SettingsNavView({ billable, pathname }: { readonly billable: boolean; readonly pathname: string })
{
    const sections = billable ? BILLABLE_SETTINGS : SETTINGS;

    return (
        <nav aria-label="설정" className="flex shrink-0 flex-col gap-5 md:w-52">
            {sections.map((section) => (
                <div key={section.label} className="flex flex-col gap-1">
                    <p className="px-2 text-xs font-medium text-muted-foreground">{section.label}</p>
                    <ul className="flex flex-col gap-0.5">
                        {section.items.map((item) =>
                        {
                            const active = pathname === item.match || pathname.startsWith(`${item.match}/`);

                            return (
                                <li key={item.match}>
                                    <Link
                                        href={item.href}
                                        aria-current={active ? "page" : undefined}
                                        className={cn(
                                            "flex h-8 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-4",
                                            active && "bg-muted font-medium text-foreground",
                                        )}
                                    >
                                        <item.icon aria-hidden />
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </nav>
    );
}

export function SettingsNav({ billable }: { readonly billable: boolean })
{
    return <SettingsNavView billable={billable} pathname={usePathname()} />;
}

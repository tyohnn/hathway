"use client";

import { createContext, use, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { buttonVariants } from "@hathway/ui/components/button";
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
} from "@hathway/ui/components/command";
import { Kbd } from "@hathway/ui/components/kbd";
import { Plus, Search } from "@hathway/ui/icons";
import { cn } from "@hathway/ui/lib/utils";

import { creatables } from "@/lib/paths";

import { paletteFor } from "./navGroups";

/**
 * 어디서든 쓰는 이동과 만들기(`/ia-design` 의 대시보드 해부도 2번). 사이드바 머리 아래의 도구 줄과 ⌘K 팔레트가 한 벌이다.
 *
 * ⚠ **팔레트를 여는 상태는 셸(정적 틀)에 산다.** ⌘K 는 행위자를 알기 전에도 먹어야 해서 열쇠 듣기를 기다리는 조각 안에 두지 않는다.
 *    행위자에 따라 달라지는 것(결제하는 조직의 「요금제」)만 사이드바 메뉴가 행위자를 읽은 뒤 `BillableSignal` 로 알려 준다.
 * ⚠ **팔레트의 항목은 메뉴의 정본에서 뽑는다**(`navGroups.tsx` 의 `paletteFor`). 팔레트에만 있는 이동을 두지 않는다. 메뉴로 갈 수 없는
 *    곳이 팔레트로만 열리면 사람이 그 길을 다시 찾지 못한다.
 */
interface PaletteState
{
    readonly open: boolean;
    readonly setOpen: (open: boolean) => void;
    readonly billable: boolean;
    readonly setBillable: (billable: boolean) => void;
}

const PaletteContext = createContext<PaletteState | null>(null);

const usePalette = (): PaletteState =>
{
    const state = use(PaletteContext);

    if (state === null)
    {
        throw new Error("PaletteProvider 밖에서 팔레트를 쓸 수 없다");
    }

    return state;
};

export function PaletteProvider({ children }: { readonly children: ReactNode })
{
    const [open, setOpen] = useState(false);
    const [billable, setBillable] = useState(false);

    useEffect(() =>
    {
        const onKey = (event: KeyboardEvent): void =>
        {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k")
            {
                event.preventDefault();
                setOpen((now) => !now);
            }
        };

        window.addEventListener("keydown", onKey);

        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const state = useMemo(() => ({ open, setOpen, billable, setBillable }), [open, billable]);

    return (
        <PaletteContext value={state}>
            {children}
            <CommandPalette />
        </PaletteContext>
    );
}

/** 사이드바 메뉴가 행위자를 읽은 뒤 결제하는 조직인지 알려 준다. 그리는 것은 없다 */
export function BillableSignal({ billable }: { readonly billable: boolean })
{
    const { setBillable } = usePalette();

    useEffect(() =>
    {
        setBillable(billable);
    }, [billable, setBillable]);

    return null;
}

function CommandPalette()
{
    const { open, setOpen, billable } = usePalette();
    const router = useRouter();
    const destinations = useMemo(() => paletteFor(billable), [billable]);

    const go = (href: string): void =>
    {
        setOpen(false);
        router.push(href);
    };

    return (
        <CommandDialog open={open} onOpenChange={setOpen} title="찾기" description="갈 곳이나 만들 것을 고르세요">
            {/* ⚠ `Command` 가 감싸야 한다. 칸과 목록이 그 안의 상태를 함께 읽는다. 빠뜨리면 팔레트를 여는 순간 화면이 통째로 무너진다(2026-10-06 e2e) */}
            <Command>
                <CommandInput placeholder="어디로 갈까요?" />
                <CommandList>
                    <CommandEmpty>맞는 것이 없어요</CommandEmpty>
                    <CommandGroup heading="만들기">
                        {creatables.map((entry) => (
                            <CommandItem key={entry.href} value={`${entry.action} 새 ${entry.label} 만들기`} onSelect={() => go(entry.href)}>
                                <Plus aria-hidden />
                                <span>{entry.action}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                    <CommandGroup heading="이동">
                        {destinations.map((entry) => (
                            <CommandItem key={entry.href} value={entry.hint === undefined ? entry.label : `${entry.hint} ${entry.label}`} onSelect={() => go(entry.href)}>
                                <entry.icon aria-hidden />
                                <span>{entry.label}</span>
                                {entry.hint === undefined ? null : <CommandShortcut>{entry.hint}</CommandShortcut>}
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </CommandDialog>
    );
}

/**
 * 사이드바 머리 아래의 도구 줄. 찾기(⌘K)와 만들기다. 접힌 사이드바에서는 아이콘만 남는다.
 *
 * ⚠ 만들 수 있는 것이 하나면 만들기는 그 화면으로 가는 링크다. 둘 이상이면 팔레트의 「만들기」 갈래를 연다. 고를 것이 하나인
 *    메뉴를 한 번 더 누르게 하지 않는다.
 */
export function ShellTools()
{
    const { setOpen } = usePalette();
    const only = creatables.length === 1 ? creatables[0] : undefined;
    const createClass = cn(buttonVariants({ variant: "outline", size: "icon" }), "shrink-0");

    return (
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col">
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-keyshortcuts="Meta+K Control+K"
                className={cn(
                    buttonVariants({ variant: "outline" }),
                    "min-w-0 flex-1 justify-start gap-2 text-muted-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0",
                )}
            >
                <Search aria-hidden />
                <span className="group-data-[collapsible=icon]:hidden">찾기</span>
                <Kbd className="ml-auto group-data-[collapsible=icon]:hidden">⌘K</Kbd>
            </button>
            {only === undefined
                ? (
                    <button type="button" onClick={() => setOpen(true)} aria-label="만들기" className={createClass}>
                        <Plus aria-hidden />
                    </button>
                )
                : (
                    <Link href={only.href} aria-label={only.action} className={createClass}>
                        <Plus aria-hidden />
                    </Link>
                )}
        </div>
    );
}

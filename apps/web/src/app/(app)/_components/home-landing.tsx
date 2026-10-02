"use client";

import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { EmptyState } from "@investment/blocks/empty-state";
import { ItemList, type ListItem } from "@investment/blocks/item-list";
import { PageHeader } from "@investment/blocks/page-header";
import { SectionHeader } from "@investment/blocks/section-header";
import { Button } from "@investment/ui/components/button";
import { companyHref, companyMetaLine, type CompanyIndex } from "@/lib/platform/company-index";
import { ShortcutHint, SymbolCommandTrigger, useSymbolCommand } from "@/components/symbol-command";

/** 처음에 세우는 종목 수. 나머지는 검색으로 찾는다 */
const SHOWN = 20;

const itemOf = (company: CompanyIndex): ListItem => ({
    id: company.stock_code,
    title: company.name,
    description: companyMetaLine(company),
    meta: company.stock_code,
    media: (
        <span className="flex size-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            {company.name.slice(0, 1)}
        </span>
    ),
});

/**
 * 첫 화면. 종목을 찾는 칸과 최근 본 종목과 전체 종목이 선다. 제목과 구획과 목록은 블록이 그린다.
 *
 * ⚠ 검색 칸은 블록이 아니라 종목 검색 창(`SymbolCommand`)을 여는 단추다. 입력을 받는 칸처럼 보이지만 누르면 창이 열린다.
 */
export function HomeLanding()
{
    const router = useRouter();
    const { companies, recentCodes, remember } = useSymbolCommand();
    const recent = recentCodes
        .map((code) => companies.find((company) => company.stock_code === code))
        .filter((company): company is NonNullable<typeof company> => Boolean(company));

    const open = (item: ListItem): void =>
    {
        remember(item.id);
        router.push(companyHref(item.id));
    };

    return (
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
            <PageHeader title="종목 검색" />

            <SymbolCommandTrigger
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-[var(--shadow-card)] transition-colors hover:border-primary/50 hover:bg-accent/40"
            >
                <MagnifyingGlassIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-sm text-muted-foreground">종목명, 종목코드</span>
                <ShortcutHint />
            </SymbolCommandTrigger>

            {recent.length > 0 && (
                <section className="flex flex-col gap-2">
                    <SectionHeader level={2} title="최근 본 종목" />
                    <ItemList items={recent.map(itemOf)} density="compact" onItemPress={open} />
                </section>
            )}

            <section className="flex flex-col gap-2">
                <SectionHeader level={2} title="전체 종목" {...(companies.length > 0 ? { count: companies.length } : {})} />
                {companies.length === 0
                    ? (
                        <EmptyState
                            title="종목 목록을 불러오지 못했어요"
                            description="잠시 뒤 새로고침해 주세요."
                        />
                    )
                    : (
                        <>
                            <ItemList items={companies.slice(0, SHOWN).map(itemOf)} density="compact" onItemPress={open} />
                            {companies.length > SHOWN && (
                                <SymbolCommandTrigger asChild>
                                    <Button type="button" variant="ghost" size="sm">
                                        나머지 {companies.length - SHOWN}개 종목 검색하기
                                    </Button>
                                </SymbolCommandTrigger>
                            )}
                        </>
                    )}
            </section>
        </div>
    );
}

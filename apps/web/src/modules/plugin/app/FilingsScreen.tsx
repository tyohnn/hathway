import type { FilingItem, FilingKind, FilingsView } from "../investing/contract";

import { ExternalLink } from "@hathway/ui/icons";
import { cn } from "@hathway/ui/lib/utils";

import { COPY } from "./copy";
import { formatDay } from "./format";
import { ActionButton, CompanyTitle, InlineCard, Notice, Pending, type OnAction, type ScreenProps } from "./parts";
import type { AppState } from "./state";

/**
 * 공시 타임라인. 날짜 · 갈래 점 · 제목이 한 줄이고, 줄을 누르면 DART 원문이 밖에서 열린다(알파스퀘어의 「종목 이슈」 줄).
 * 원문은 우리 것이 아닌 곳이라 밖으로 나가도 된다. 요약은 「최근 공시 요약해 줘」가 대화에 맡긴다.
 *
 * ⚠ **카드에는 여섯 줄까지 싣는다.** 카드 안에서 스크롤하지 않는다. 나머지는 모델이 말로 이어 간다.
 */
const SHOWN = 6;

const DOT: Readonly<Record<FilingKind, string>> = {
    regular: "bg-foreground/45",
    major: "bg-chart-3",
    ownership: "bg-chart-1",
    other: "bg-muted-foreground/40",
};

export function FilingsScreen({ view, state, onAction }: ScreenProps<FilingsView>)
{
    const items: ReadonlyArray<FilingItem | null> = view?.items.slice(0, SHOWN) ?? Array.from({ length: 5 }, () => null);
    // 올해의 날짜는 연도를 빼고 쓴다. 기준은 가장 최근 공시의 해다. 렌더 중에 오늘을 읽지 않는다
    const year = view?.items[0] === undefined ? null : Number(view.items[0].date.slice(0, 4));

    return (
        <InlineCard
            page="filings"
            loading={view === null}
            source={view?.source ?? null}
            actions={state.abilities.message
                ? (
                    <ActionButton name="summarize" size="sm" disabled={view === null || view.items.length === 0} onAction={onAction}
                        action={{ kind: "send", text: COPY.prompts.filings(view?.company.name ?? "") }}
                    >
                        {COPY.actions.summarizeFilings}
                    </ActionButton>
                )
                : null}
        >
            <CompanyTitle company={view?.company ?? null} />
            {view !== null && view.items.length === 0
                ? <p className="text-sm text-muted-foreground">{COPY.filings.empty}</p>
                : (
                    <ol className="-mx-2 flex flex-col">
                        {items.map((item, index) => <Line key={item?.rceptNo ?? index} item={item} year={year} state={state} onAction={onAction} />)}
                    </ol>
                )}
            <Notice text={state.notice} />
        </InlineCard>
    );
}

function Line({ item, year, state, onAction }: { readonly item: FilingItem | null; readonly year: number | null; readonly state: AppState; readonly onAction: OnAction })
{
    const body = (
        <>
            <span className="w-14 shrink-0 text-xs text-muted-foreground tabular-nums">{item === null ? <Pending className="w-10" /> : formatDay(item.date, year)}</span>
            <span className="flex w-16 shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", item === null ? "bg-muted" : DOT[item.kind])} />
                {item === null ? <Pending className="w-8" /> : COPY.filings.kind[item.kind]}
            </span>
            <span className={cn("min-w-0 flex-1 truncate text-sm", item?.kind === "major" && "font-medium")}>{item === null ? <Pending className="w-40" /> : item.title}</span>
            {item === null ? null : <ExternalLink aria-hidden className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
        </>
    );
    const className = "group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none";

    if (item === null)
    {
        return <li><div className={className}>{body}</div></li>;
    }

    return (
        <li>
            {state.abilities.openLink
                ? (
                    <button type="button" className={className} data-action="open-dart" aria-label={`${item.title} ${COPY.actions.openDart}`} onClick={() => onAction({ kind: "open", url: item.url })}>
                        {body}
                    </button>
                )
                : <a className={className} href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.title} ${COPY.actions.openDart}`}>{body}</a>}
        </li>
    );
}

import type { BoardCard, CompanyRef, HomeView, KeyMetric } from "../investing/contract";

import { Badge } from "@hathway/ui/components/badge";
import { Card } from "@hathway/ui/components/card";
import { ArrowUp, Kanban } from "@hathway/ui/icons";

import { boardContext, companyContext } from "./context";
import { COPY } from "./copy";
import { formatMetric } from "./format";
import { ActionButton, AddToggle, Delta, Notice, Pending, Section, WideFrame, type OnAction, type ScreenProps } from "./parts";
import type { AppState } from "./state";

/**
 * 사이드바 홈. 대화 없이 와서 둘러보는 곳이다. 위에서부터 물어볼 말 셋 → 최근 본 종목 → 내 리서치 보드.
 * 카드마다 주 단추는 새 일을 시작하는 「분석 시작」이고, 그 아래 「대화에 추가」로 지금 대화의 맥락에 싣는다(한글파일럿 홈의 짜임).
 *
 * ⚠ **웹으로 내보내지 않는다.** 둘러보기는 사이드바 안에서 끝나고, 일은 대화로 돌아간다.
 */
type HomeCompany = CompanyRef & { readonly headline: ReadonlyArray<KeyMetric> };

export function HomeScreen({ view, state, onAction }: ScreenProps<HomeView>)
{
    const companies: ReadonlyArray<HomeCompany | null> = view?.companies ?? [null, null, null, null];

    return (
        <WideFrame page="home" loading={view === null}>
            <header className="flex flex-col gap-1">
                <h1 className="text-xl font-semibold tracking-tight">{COPY.home.title}</h1>
            </header>
            <Notice text={state.notice} />
            {state.abilities.message
                ? (
                    <Section title={COPY.home.quick}>
                        <div className="flex flex-wrap gap-2">
                            {COPY.home.quickPrompts.map((prompt, index) => (
                                <ActionButton key={prompt} name="quick" size="sm" variant="outline" className="rounded-full" onAction={onAction} action={{ kind: "send", text: prompt }}>
                                    <ArrowUp aria-hidden className="rotate-45" />
                                    {COPY.home.quickLabels[index]}
                                </ActionButton>
                            ))}
                        </div>
                    </Section>
                )
                : null}
            <Section title={COPY.home.recent} aside={view !== null && view.companies.length === 0 ? null : <span className="text-[11px] text-muted-foreground">▲▼ {COPY.company.yoy}</span>}>
                {view !== null && view.companies.length === 0
                    ? <p className="text-sm text-muted-foreground">{COPY.home.recentEmpty}</p>
                    : (
                        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {companies.map((company, index) => <CompanyTile key={company?.stockCode ?? index} company={company} state={state} onAction={onAction} />)}
                        </ul>
                    )}
            </Section>
            <Section title={COPY.home.boards}>
                {view === null
                    ? <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[0, 1].map((index) => <BoardTile key={index} board={null} state={state} onAction={onAction} />)}</ul>
                    : !view.signedIn
                        ? <p className="text-sm text-muted-foreground">{COPY.home.signedOut}</p>
                        : view.boards.length === 0
                            ? <p className="text-sm text-muted-foreground">{COPY.home.boardsEmpty}</p>
                            : <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">{view.boards.map((board) => <BoardTile key={board.slug} board={board} state={state} onAction={onAction} />)}</ul>}
            </Section>
        </WideFrame>
    );
}

function CompanyTile({ company, state, onAction }: { readonly company: HomeCompany | null; readonly state: AppState; readonly onAction: OnAction })
{
    const metrics: ReadonlyArray<KeyMetric | null> = company?.headline.slice(0, 2) ?? [null, null];

    return (
        <li className="flex">
            <Card size="sm" className="w-full gap-2.5 px-3">
                <div className="flex min-w-0 items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{company === null ? <Pending className="w-20" /> : company.name}</span>
                    </div>
                <span className="-mt-1.5 truncate text-[11px] text-muted-foreground tabular-nums">
                    {company === null
                        ? <Pending className="w-24" />
                        : [company.stockCode, company.market === null ? null : COPY.market[company.market], company.sector].filter((each) => each !== null).join(" · ")}
                </span>
                <dl className="grid grid-cols-2 gap-2">
                    {metrics.map((metric, index) => (
                        <div key={metric?.key ?? index} className="flex min-w-0 flex-col">
                            <dt className="truncate text-[11px] text-muted-foreground">{metric === null ? <Pending className="w-10" /> : metric.label}</dt>
                            <dd className="text-sm font-semibold tabular-nums">{metric === null ? <Pending className="w-14" /> : formatMetric(metric.value, metric.unit, { compact: true })}</dd>
                            <dd className="h-4 text-[11px]">{metric === null ? null : <Delta value={metric.change} unit={metric.unit} />}</dd>
                        </div>
                    ))}
                </dl>
                <div className="mt-auto flex flex-wrap gap-1.5">
                    {state.abilities.message
                        ? (
                            <ActionButton name="analyze" size="sm" disabled={company === null} onAction={onAction}
                                aria-label={company === null ? undefined : `${company.name} ${COPY.actions.analyze}`}
                                action={{ kind: "send", text: COPY.prompts.analyze(company?.name ?? "") }}
                            >
                                {COPY.actions.analyze}
                            </ActionButton>
                        )
                        : null}
                    <AddToggle item={company === null ? null : companyContext(company, company.headline, null)} state={state} onAction={onAction} size="sm" {...(company === null ? {} : { label: company.name })} />
                </div>
            </Card>
        </li>
    );
}

/** 보드 한 장. 사이드바 홈과 대화 옆 패널이 함께 쓴다 */
export function BoardTile({ board, state, onAction, primary = "continue" }: {
    readonly board: BoardCard | null;
    readonly state: AppState;
    readonly onAction: OnAction;
    /** 사이드바는 「이어서 분석」이 주 단추이고, 패널은 「대화에 추가」 하나만 세운다 */
    readonly primary?: "continue" | "add";
})
{
    return (
        <li>
            <Card size="sm" className="px-3">
                <div className="flex items-center gap-2.5">
                    <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground"><Kanban className="size-4" /></span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-sm font-semibold">{board === null ? <Pending className="w-28" /> : board.title}</span>
                        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground tabular-nums">
                            {board === null
                                ? <Pending className="w-24" />
                                : (
                                    <>
                                        <Badge variant="secondary">{COPY.boards.theme[board.theme]}</Badge>
                                        <span className="truncate">{COPY.boards.widgets(board.widgets)}{board.updatedAt === null ? null : ` · ${board.updatedAt}`}</span>
                                    </>
                                )}
                        </span>
                    </div>
                    {/* 단추는 제목 줄의 오른쪽에 같은 높이로 선다 */}
                    <div className="flex shrink-0 gap-1.5">
                        {primary === "continue" && state.abilities.message
                            ? (
                                <ActionButton name="continue-board" size="sm" disabled={board === null} onAction={onAction}
                                    aria-label={board === null ? undefined : `${board.title} ${COPY.actions.continueBoard}`}
                                    action={{ kind: "send", text: COPY.prompts.board(board?.title ?? "") }}
                                >
                                    {COPY.actions.continueBoard}
                                </ActionButton>
                            )
                            : null}
                        <AddToggle item={board === null ? null : boardContext(board)} state={state} onAction={onAction} size="sm" {...(board === null ? {} : { label: board.title })} />
                    </div>
                </div>
            </Card>
        </li>
    );
}

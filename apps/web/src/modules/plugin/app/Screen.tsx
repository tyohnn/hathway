import { BoardsScreen } from "./BoardsScreen";
import { CompanyScreen } from "./CompanyScreen";
import { COPY } from "./copy";
import { FilingsScreen } from "./FilingsScreen";
import { FinancialsScreen } from "./FinancialsScreen";
import { HomeScreen } from "./HomeScreen";
import { Notice, type OnAction } from "./parts";
import { PeersScreen } from "./PeersScreen";
import { ScreenerScreen } from "./ScreenerScreen";
import type { AppState } from "./state";
import { ValuationScreen } from "./ValuationScreen";

/**
 * 상태를 화면 하나로 고른다. 도구의 결과가 정한 `page` 로 가르고, 결과가 오기 전에는 띄운 도구로 짐작한 화면의 기다리는 얼굴을 그린다.
 * 상태만 받는 컴포넌트라 브라우저 없이 그릴 수 있다.
 *
 * 화면마다 같은 원칙이다. 하나를 먼저 보이고, 단추는 둘까지, 주 단추는 대화로 돌아가는 말 하나다.
 *
 * ⚠ **호스트가 알리지 않은 능력의 단추는 그리지 않는다.** 눌러도 되지 않는 단추를 세우지 않는다.
 */
export function Screen({ state, onAction }: { readonly state: AppState; readonly onAction: OnAction })
{
    const { view } = state;
    const page = view?.page ?? state.expected;

    switch (page)
    {
        case "company":
            return <CompanyScreen view={view?.page === "company" ? view : null} state={state} onAction={onAction} />;
        case "financials":
            return <FinancialsScreen view={view?.page === "financials" ? view : null} state={state} onAction={onAction} />;
        case "peers":
            return <PeersScreen view={view?.page === "peers" ? view : null} state={state} onAction={onAction} />;
        case "valuation":
            return <ValuationScreen view={view?.page === "valuation" ? view : null} state={state} onAction={onAction} />;
        case "filings":
            return <FilingsScreen view={view?.page === "filings" ? view : null} state={state} onAction={onAction} />;
        case "screen":
            return <ScreenerScreen view={view?.page === "screen" ? view : null} state={state} onAction={onAction} />;
        case "home":
            return <HomeScreen view={view?.page === "home" ? view : null} state={state} onAction={onAction} />;
        case "boards":
            return <BoardsScreen view={view?.page === "boards" ? view : null} state={state} onAction={onAction} />;
        case null:
        case undefined:
            return (
                <main className="flex flex-col gap-2 p-4" data-page="waiting">
                    <Notice text={state.notice} />
                    {state.notice === null ? <p className="text-sm text-muted-foreground" role="status">{COPY.waiting}</p> : null}
                </main>
            );
    }
}

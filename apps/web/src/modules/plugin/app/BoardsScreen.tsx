import type { BoardsView } from "../investing/contract";

import { COPY } from "./copy";
import { BoardTile } from "./HomeScreen";
import { Notice, type ScreenProps } from "./parts";

/**
 * 대화 옆 패널의 리서치 보드 서랍. 지금 대화로 끌어올 보드를 고르는 곳이라 주 단추는 「대화에 추가」 하나다.
 * 패널은 좁아서 보드를 한 줄에 하나씩 쌓는다.
 */
export function BoardsScreen({ view, state, onAction }: ScreenProps<BoardsView>)
{
    return (
        <main className="flex flex-col gap-3 p-4" data-page="boards" data-loading={view === null ? "" : undefined} aria-busy={view === null}>
            <h1 className="text-base font-semibold tracking-tight">{COPY.boards.title}</h1>
            <Notice text={state.notice} />
            {view === null
                ? <ul className="flex flex-col gap-2">{[0, 1, 2].map((index) => <BoardTile key={index} board={null} state={state} onAction={onAction} primary="add" />)}</ul>
                : !view.signedIn
                    ? <p className="text-sm text-muted-foreground">{COPY.boards.signedOut}</p>
                    : view.boards.length === 0
                        ? <p className="text-sm text-muted-foreground">{COPY.boards.empty}</p>
                        : <ul className="flex flex-col gap-2">{view.boards.map((board) => <BoardTile key={board.slug} board={board} state={state} onAction={onAction} primary="add" />)}</ul>}
        </main>
    );
}

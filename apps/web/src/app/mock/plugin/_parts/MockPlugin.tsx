"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";

import { ArrowUp, Mic, PanelLeft, Plus, X } from "@hathway/ui/icons";
import { cn } from "@hathway/ui/lib/utils";

import * as F from "./fixtures";
import { WidgetFrame, type HostEvent } from "./WidgetFrame";

/**
 * ChatGPT 의 틀을 흉내 낸 목업. 장면마다 실제 화면(구운 `APP_HTML`)을 iframe 에 띄우고 표본 결과를 보낸다.
 *
 * 주소의 `?theme=light|dark` 가 판의 밝기를, `?scene=<id>` 가 장면 하나만 보이기를 고른다. 사진을 찍는 스크립트가 둘을 쓴다.
 *
 * ⚠ 틀은 호스트의 것이라 우리 디자인 시스템의 대상이 아니다. 무채색 토큰만 써서 우리 화면과 섞이지 않게 한다.
 */
interface Scene
{
    readonly id: string;
    readonly title: string;
    readonly place: "inline" | "fullscreen" | "sidebar" | "panel";
    readonly tool: string;
    readonly result: Record<string, unknown> | null;
    readonly user?: string;
    readonly assistant?: string;
    readonly height?: number;
}

const SCENES: ReadonlyArray<Scene> = [
    { id: "company", title: "종목 요약", place: "inline", tool: "show_company", result: { ...F.company }, user: "크래프톤", assistant: "크래프톤은 영업이익률 40%대를 5년째 지키고 있어요. 분석을 시작할까요?" },
    { id: "company-full", title: "종목 요약 크게 보기", place: "fullscreen", tool: "show_company", result: { ...F.company }, height: 900 },
    { id: "company-loading", title: "종목 요약 기다리는 얼굴", place: "inline", tool: "show_company", result: null, user: "크래프톤" },
    { id: "financials", title: "재무 추이", place: "inline", tool: "show_financials", result: { ...F.financials }, user: "분기 실적은?", assistant: "1분기마다 신작 효과로 튀고 4분기에 내려오는 모양이에요." },
    { id: "peers", title: "피어 비교", place: "inline", tool: "compare_peers", result: { ...F.peers }, user: "게임 업종 경쟁사 비교해 줘", assistant: "영업이익률로는 시프트업 다음이고, 매출 규모는 가장 커요." },
    { id: "valuation", title: "적정가", place: "inline", tool: "value_company", result: { ...F.valuation }, user: "적정가 계산해 줘", assistant: "기본 시나리오로 보면 오늘 주가는 매수가보다 위에 있어요." },
    { id: "valuation-full", title: "시나리오 9칸", place: "fullscreen", tool: "value_company", result: { ...F.valuation }, height: 820 },
    { id: "valuation-refused", title: "적정가 계산 거절", place: "inline", tool: "value_company", result: { ...F.valuationRefused }, user: "펄어비스 적정가 계산해 줘" },
    { id: "filings", title: "공시 타임라인", place: "inline", tool: "list_filings", result: { ...F.filings }, user: "최근 공시 뭐 있어?", assistant: "10월 14일에 자기주식 취득을 결정했어요." },
    { id: "screen", title: "종목 찾기 결과", place: "fullscreen", tool: "screen_stocks", result: { ...F.screen }, height: 720 },
    { id: "screen-inline", title: "종목 찾기 미리보기", place: "inline", tool: "screen_stocks", result: { ...F.screen }, user: "영업이익률 20% 넘는 게임사" },
    { id: "home", title: "사이드바 홈", place: "sidebar", tool: "open_home", result: { ...F.home }, height: 900 },
    { id: "home-signed-out", title: "사이드바 홈 · 로그인 전", place: "sidebar", tool: "open_home", result: { ...F.homeSignedOut }, height: 720 },
    { id: "boards", title: "리서치 보드 패널", place: "panel", tool: "open_boards", result: { ...F.boardsView }, user: "지난번 분석 이어서", assistant: "최근 보드 셋이에요. 옆 패널에서 골라 대화에 추가해 주세요.", height: 420 },
    { id: "boards-signed-out", title: "리서치 보드 패널 · 로그인 전", place: "panel", tool: "open_boards", result: { ...F.boardsSignedOut }, user: "지난번 분석 이어서", assistant: "로그인하면 옆 패널에서 리서치 보드를 골라 대화에 가져올 수 있어요.", height: 420 },
];

const readParams = (): { readonly theme: "light" | "dark"; readonly scene: string | null } =>
{
    const params = new URLSearchParams(window.location.search);

    return { theme: params.get("theme") === "dark" ? "dark" : "light", scene: params.get("scene") };
};

export function MockPlugin()
{
    const { setTheme } = useTheme();
    const [params, setParams] = useState<{ readonly theme: "light" | "dark"; readonly scene: string | null } | null>(null);

    useEffect(() =>
    {
        const next = readParams();

        setParams(next);
        setTheme(next.theme);
    }, [setTheme]);

    if (params === null)
    {
        return null;
    }

    const shown = params.scene === null ? SCENES : SCENES.filter((scene) => scene.id === params.scene);

    return (
        <main className="min-h-screen bg-muted/40" data-theme={params.theme}>
            <div className={cn("mx-auto flex max-w-[1240px] flex-col gap-12", params.scene === null ? "px-6 py-10" : "p-4")}>
                {params.scene === null
                    ? (
                        <header className="flex flex-col gap-2">
                            <h1 className="text-2xl font-semibold tracking-tight">Hathway 기업분석 · 플러그인 화면 목업</h1>
                            <p className="text-sm text-muted-foreground">표본 데이터로 그린 실제 화면이에요. 숫자는 실제 공시 값이 아니에요.</p>
                        </header>
                    )
                    : null}
                {shown.map((scene) => <SceneView key={scene.id} scene={scene} theme={params.theme} bare={params.scene !== null} />)}
            </div>
        </main>
    );
}

function SceneView({ scene, theme, bare }: { readonly scene: Scene; readonly theme: "light" | "dark"; readonly bare: boolean })
{
    const [attached, setAttached] = useState<ReadonlyArray<string>>([]);
    const [sent, setSent] = useState<string | null>(null);

    const onHostEvent = (event: HostEvent): void =>
    {
        if (event.method === "ui/update-model-context")
        {
            const content = Array.isArray(event.params["content"]) ? event.params["content"] as ReadonlyArray<{ _meta?: { "openai/title"?: string } }> : [];

            setAttached(content.map((block) => block._meta?.["openai/title"] ?? ""));
        }
        else if (event.method === "ui/message")
        {
            const content = Array.isArray(event.params["content"]) ? event.params["content"] as ReadonlyArray<{ text?: string }> : [];

            setSent(content[0]?.text ?? null);
        }
    };

    const displayMode = scene.place === "inline" || scene.place === "panel" ? "inline" : "fullscreen";
    // 테마나 표시 방식이 바뀌면 창을 새로 세운다. 위젯은 악수할 때 한 번만 호스트의 값을 읽는다
    const widget = (
        <WidgetFrame
            key={`${theme}-${displayMode}-${scene.tool}`}
            tool={scene.tool}
            result={scene.result}
            theme={theme}
            displayMode={displayMode}
            {...(scene.height === undefined ? {} : { height: scene.height })}
            onHostEvent={onHostEvent}
        />
    );

    return (
        <section id={scene.id} className="flex scroll-mt-8 flex-col gap-3" data-scene={scene.id}>
            {bare ? null : <h2 className="text-lg font-semibold tracking-tight">{scene.title}</h2>}
            {scene.place === "fullscreen" || scene.place === "sidebar"
                ? <Fullscreen sidebar={scene.place === "sidebar"} attached={attached}>{widget}</Fullscreen>
                : (
                    <HostWindow side={scene.place === "panel" ? <PanelChrome>{widget}</PanelChrome> : undefined} attached={attached}>
                        {scene.user === undefined ? null : <UserSays>{scene.user}</UserSays>}
                        {scene.place === "inline" ? <Inline>{widget}</Inline> : null}
                        {scene.assistant === undefined ? null : <AssistantSays>{scene.assistant}</AssistantSays>}
                        {sent === null ? null : <UserSays>{sent}</UserSays>}
                    </HostWindow>
                )}
        </section>
    );
}

function HostWindow({ children, side, attached }: { readonly children: ReactNode; readonly side?: ReactNode; readonly attached: ReadonlyArray<string> })
{
    return (
        <div className="flex overflow-hidden rounded-2xl border bg-background shadow-sm">
            <div className="hidden w-14 shrink-0 flex-col items-center gap-3 border-r bg-muted/40 py-4 md:flex">
                <PanelLeft className="size-5 text-muted-foreground" aria-hidden />
                <div className="mt-2 size-8 rounded-lg bg-muted" />
                <div className="size-8 rounded-lg bg-muted" />
            </div>
            <div className="relative flex min-w-0 flex-1 flex-col">
                <div className="flex h-12 items-center gap-2 border-b px-4 text-sm font-medium text-muted-foreground">ChatGPT</div>
                <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-5 px-6 py-6">{children}</div>
                <Composer attached={attached} />
            </div>
            {side === undefined ? null : <aside className="flex w-[380px] shrink-0 flex-col border-l bg-background">{side}</aside>}
        </div>
    );
}

function Composer({ attached }: { readonly attached: ReadonlyArray<string> })
{
    return (
        <div className="mx-auto w-full max-w-[720px] px-6 pb-5">
            <div className="flex flex-col gap-2 rounded-3xl border bg-background px-3 py-2.5 shadow-sm">
                {attached.length === 0
                    ? null
                    : (
                        <div className="flex flex-wrap gap-1.5">
                            {attached.map((title) => <span key={title} className="rounded-lg border bg-muted/60 px-2 py-1 text-xs">{title}</span>)}
                        </div>
                    )}
                <div className="flex items-center gap-2">
                    <Plus className="size-5 text-muted-foreground" aria-hidden />
                    <span className="flex-1 text-sm text-muted-foreground">무엇이든 물어보세요</span>
                    <Mic className="size-5 text-muted-foreground" aria-hidden />
                    <span className="grid size-8 place-items-center rounded-full bg-foreground text-background"><ArrowUp className="size-4" aria-hidden /></span>
                </div>
            </div>
        </div>
    );
}

function UserSays({ children }: { readonly children: ReactNode })
{
    return <div className="ml-auto max-w-[80%] rounded-3xl bg-muted px-4 py-2.5 text-sm leading-relaxed">{children}</div>;
}

function AssistantSays({ children }: { readonly children: ReactNode })
{
    return <div className="text-sm leading-relaxed">{children}</div>;
}

function AppLabel()
{
    return (
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="grid size-4 place-items-center rounded bg-foreground text-[9px] font-bold text-background">H</span>
            Hathway 기업분석
        </div>
    );
}

/** 대화 안에 뜨는 우리 화면. 호스트는 앱 이름 줄만 붙이고 판은 화면의 카드가 갖는다 */
function Inline({ children }: { readonly children: ReactNode })
{
    return (
        <div className="flex flex-col gap-1.5">
            <AppLabel />
            {children}
        </div>
    );
}

/** 전체 화면과 사이드바. 호스트의 머리와 아래 입력창이 남는다 */
function Fullscreen({ children, sidebar, attached }: { readonly children: ReactNode; readonly sidebar: boolean; readonly attached: ReadonlyArray<string> })
{
    return (
        <div className="flex overflow-hidden rounded-2xl border bg-background shadow-sm">
            {sidebar
                ? (
                    <div className="hidden w-60 shrink-0 flex-col gap-2 border-r bg-muted/40 p-3 text-sm md:flex">
                        <span className="px-2 py-1.5 text-muted-foreground">새 채팅</span>
                        <span className="rounded-lg bg-muted px-2 py-1.5 font-medium">Hathway 기업분석</span>
                        <span className="px-2 py-1.5 text-muted-foreground">채팅 기록</span>
                    </div>
                )
                : null}
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
                    <AppLabel />
                    <X className="ml-auto size-5 text-muted-foreground" aria-hidden />
                </div>
                <div className="min-h-0 flex-1">{children}</div>
                <div className="border-t pt-3"><Composer attached={attached} /></div>
            </div>
        </div>
    );
}

function PanelChrome({ children }: { readonly children: ReactNode })
{
    return (
        <>
            <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
                <AppLabel />
                <X className="ml-auto size-5 text-muted-foreground" aria-hidden />
            </div>
            <div className="min-h-0 flex-1">{children}</div>
        </>
    );
}

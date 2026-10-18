import type { ReactNode } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { Button } from "@hathway/ui/components/button";
import { ArrowLeft, ArrowRight, ChevronDown } from "@hathway/ui/icons";
import { PendingText } from "@hathway/blocks/pending";
import { StatusBadge } from "@hathway/blocks/status-badge";

import { approveConsent, denyConsent } from "@/actions/consent";
import { BRAND } from "@/app/_components/AuthShell";
import { LegalNote } from "@/app/_components/LegalNote";
import { clientBrandOf, consentPermissions, type ClientBrand, type ConsentPermissions, type PermissionKind } from "@/lib/consent";
import { consentTools, readConsent } from "@/usecases/consent";

import { ClientLogo } from "./ClientLogo";

/**
 * 무엇을 허용하는지 보이고 사람이 정하는 자리.
 *
 * ⚠ **권한은 실제 도구와 범위에서 뽑는다**(`lib/consent.ts`). 화면에 적은 목록과 토큰이 여는 일이 어긋나면 사람은
 *    보지 못한 일을 허락하게 된다.
 * ⚠ **앱 이름은 바깥에서 온 값이다.** 동적 등록을 켜 두면 아무나 이름을 정해 등록할 수 있으므로, 우리 문장과
 *    섞이지 않게 따로 세워 보인다. 앱이 등록한 그림(`logo_uri`)도 같은 까닭으로 싣지 않는다. 돌아갈 주소로 알아본 앱(ChatGPT ·
 *    Claude)은 우리가 가진 로고를 그리고, 모르는 앱은 이름의 첫 글자를 그린다.
 * ⚠ **조직을 고르는 칸을 두지 않는다.** 토큰은 조직 하나에 묶이지 않고, 부를 때마다 계정의 소속으로 행위자를 다시
 *    세운다(`lib/bearerActor.ts`). 고르는 칸을 보이면 고른 조직만 열리는 것처럼 읽힌다.
 */
export async function ConsentPanel(
    { searchParams }: { readonly searchParams: Promise<Record<string, string | string[] | undefined>> },
)
{
    await connection();

    const params = await searchParams;
    const authorizationId = typeof params.authorization_id === "string" ? params.authorization_id : "";

    if (authorizationId === "")
    {
        return <Gone />;
    }

    const view = await readConsent(authorizationId);

    // 이미 허용한 사람은 묻지 않는다. Supabase 가 준 주소로 그대로 보낸다
    if (view.kind === "redirect")
    {
        redirect(view.url);
    }

    if (view.kind === "gone")
    {
        return <Gone />;
    }

    return (
        <ConsentView
            request={{
                authorizationId,
                clientName: view.clientName,
                brand: clientBrandOf(view.clientName, view.redirectUri),
                email: view.email,
                redirectUri: view.redirectUri,
                permissions: consentPermissions(await consentTools(), view.scopes),
            }}
        />
    );
}

export interface ConsentRequest
{
    readonly authorizationId: string;
    readonly clientName: string;
    /** 알아본 앱. 모르면 `null` */
    readonly brand: ClientBrand | null;
    readonly email: string;
    readonly redirectUri: string;
    readonly permissions: ConsentPermissions;
}

const SECTION_TITLES: Readonly<Record<PermissionKind, string>> = {
    write: "읽고 쓰는 일",
    read: "읽기만 하는 일",
    account: "계정 정보",
};

/** 쓰기는 눈에 띄게, 읽기는 조용히. 사람이 먼저 봐야 하는 것은 바꾸는 일이다 */
function AccessBadge({ kind }: { readonly kind: PermissionKind })
{
    return kind === "write"
        ? <StatusBadge tone="warning" label="읽기 · 쓰기" />
        : <StatusBadge label="읽기" />;
}

/** 이름의 첫 글자. 그림 대신 서는 꾸밈이라 읽는 사람에게는 감춘다(이름은 제목과 계정 칸이 말한다) */
const initialOf = (name: string): string => (Array.from(name.trim())[0] ?? "?").toUpperCase();

function Mark({ children }: { readonly children: ReactNode })
{
    return (
        <span aria-hidden className="border-border bg-muted text-foreground flex size-12 items-center justify-center rounded-xl border text-lg font-semibold">
            {children}
        </span>
    );
}

function SectionLabel({ children }: { readonly children: ReactNode })
{
    return <h2 className="text-muted-foreground text-xs font-medium">{children}</h2>;
}

/**
 * 동의 화면의 몸통. 요청이 오기 전(`request === null`)에도 같은 틀로 선다. 앱 이름 · 계정 · 권한 줄 · 돌아갈 주소만 막대이고,
 * 제목의 뒷말과 칸 이름과 단추 둘은 같은 자리에 선다(단추는 꺼진 채). 값이 와도 화면이 움직이지 않는다.
 */
export function ConsentView({ request }: { readonly request: ConsentRequest | null })
{
    return (
        <ConsentFrame>
            <div aria-busy={request === null ? true : undefined} className="flex flex-col">
                <div className="flex items-center justify-center gap-3">
                    <Mark>{request === null ? <PendingText length={1} /> : request.brand === null ? initialOf(request.clientName) : <ClientLogo brand={request.brand} />}</Mark>
                    <span aria-hidden className="text-muted-foreground flex flex-col [&_svg]:size-3.5">
                        <ArrowRight />
                        <ArrowLeft />
                    </span>
                    <Mark>{initialOf(BRAND.strong)}</Mark>
                </div>

                <h1 className="mt-5 text-center text-lg font-bold">
                    {request === null ? <PendingText length={6} /> : request.clientName} 연결할까요?
                </h1>
                <p className="text-muted-foreground mt-1 text-center text-sm leading-6">
                    이 앱이 내 {BRAND.strong} 계정에 연결하려고 해요.
                </p>

                <section className="mt-7 flex flex-col gap-2">
                    <SectionLabel>계정</SectionLabel>
                    <div className="border-border flex items-center gap-3 rounded-lg border px-3 py-2.5">
                        <span aria-hidden className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                            {request === null ? <PendingText length={1} /> : initialOf(request.email)}
                        </span>
                        <span className="min-w-0 truncate text-sm font-medium">{request === null ? <PendingText length={12} /> : request.email}</span>
                    </div>
                </section>

                <section className="mt-6 flex flex-col gap-2">
                    <SectionLabel>권한</SectionLabel>
                    <p className="text-muted-foreground text-sm leading-6 break-keep">
                        믿을 수 있는 앱일 때만 연결해 주세요.
                    </p>

                    {/* 구분선은 칸 안쪽으로 들인다. 줄마다 배지가 오른쪽 끝에 같은 세로줄로 선다 */}
                    <ul className="border-border divide-border mt-1 flex flex-col divide-y rounded-lg border px-4">
                        {request === null
                            ? [0, 1, 2].map((index) => (
                                <li key={index} className="flex items-center justify-between gap-3 py-3.5 text-sm">
                                    <PendingText length={10} />
                                    <PendingText length={3} />
                                </li>
                            ))
                            : request.permissions.summary.map((row) => (
                                <li key={row.kind} className="flex items-center justify-between gap-3 py-3.5 text-sm leading-5">
                                    <span className="min-w-0 break-keep">{row.label}</span>
                                    <AccessBadge kind={row.kind} />
                                </li>
                            ))}
                    </ul>

                    {/* 기다리는 동안에도 같은 줄을 세워 값이 와도 단추가 밀리지 않게 한다 */}
                    {request === null
                        ? <span aria-hidden className={`${DETAILS_TOGGLE} mt-1 opacity-50`}>자세한 권한 보기<ChevronDown /></span>
                        : <Details permissions={request.permissions} />}
                </section>

                {/* 물러서는 「닫기」가 왼쪽이다(`ux-writing` 「자리별 규칙」) */}
                <div className="mt-7 flex gap-2">
                    <form action={denyConsent} className="flex-1">
                        <input type="hidden" name="authorizationId" value={request?.authorizationId ?? ""} />
                        <Button type="submit" variant="outline" className="w-full" disabled={request === null}>닫기</Button>
                    </form>
                    <form action={approveConsent} className="flex-1">
                        <input type="hidden" name="authorizationId" value={request?.authorizationId ?? ""} />
                        <Button type="submit" className="w-full" disabled={request === null}>연결하기</Button>
                    </form>
                </div>

                {/* 「연결하기」를 누르는 일이 곧 약관에 동의하는 일이라 단추 바로 아래에 둔다(로그인 화면과 같은 글) */}
                <LegalNote action="연결하면" />

                {/* 돌아갈 주소는 Supabase 가 등록된 값으로 정하고, 닫기를 눌러도 같은 곳으로 간다. 엉뚱한 곳인지 눈으로 볼 수 있게 보인다 */}
                <p className="text-muted-foreground border-border mt-6 border-t pt-5 text-center text-xs leading-5">
                    돌아갈 주소
                    <br />
                    <span className="text-foreground [overflow-wrap:anywhere]">{request === null ? <PendingText length={20} /> : request.redirectUri}</span>
                </p>
            </div>
        </ConsentFrame>
    );
}

const DETAILS_TOGGLE = "text-muted-foreground flex items-center justify-center gap-1 py-1 text-sm [&_svg]:size-4";

/**
 * 자세한 권한. 도구 하나와 범위 하나가 한 줄이다.
 *
 * ⚠ **브라우저의 `<details>` 로 편다.** 클라이언트 경계 없이 열고 닫히고, 스크립트가 늦어도 누를 수 있다.
 */
function Details({ permissions }: { readonly permissions: ConsentPermissions })
{
    return (
        <details className="group mt-1">
            <summary className={`${DETAILS_TOGGLE} hover:text-foreground cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
                <span className="group-open:hidden">자세한 권한 보기</span>
                <span className="hidden group-open:inline">자세한 권한 접기</span>
                <span className="transition-transform group-open:rotate-180"><ChevronDown /></span>
            </summary>

            {/* 칸은 굵은 선으로, 칸 안의 줄은 들여 쓴 가는 선으로 가른다. 줄마다 그 칸의 배지를 다시 달아 펼친 채로 훑어도 읽기와 쓰기가 갈린다 */}
            <div className="border-border divide-border bg-muted/30 mt-2 flex flex-col divide-y rounded-lg border">
                {permissions.sections.map((section) => (
                    <section key={section.kind} className="flex flex-col px-4 pt-4 pb-1">
                        <h3 className="text-muted-foreground text-xs font-medium tracking-wide">{SECTION_TITLES[section.kind]}</h3>
                        <ul className="divide-border/70 mt-1 flex flex-col divide-y">
                            {section.items.map((item) => (
                                <li key={item.label} className="flex items-center justify-between gap-3 py-3 text-sm leading-5">
                                    {/* 우리말로 옮기지 못한 것은 원문을 그대로 보인다(2026-09-29 사용자 결정) */}
                                    {item.raw ? <code className="text-muted-foreground min-w-0 break-all">{item.label}</code> : <span className="min-w-0 break-keep">{item.label}</span>}
                                    <AccessBadge kind={section.kind} />
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
                {permissions.staysConnected
                    ? <p className="text-muted-foreground px-4 py-3 text-xs leading-5">앱을 닫아도 연결이 이어져요.</p>
                    : null}
            </div>
        </details>
    );
}

/**
 * 셸이 없는 가운데 카드. 여기 온 사람은 우리 앱을 쓰러 온 것이 아니라 문 앞에서 한 번 정하러 온 것이라, 한 장에 다 보인다.
 */
function ConsentFrame({ children }: { readonly children: ReactNode })
{
    return (
        <main className="bg-canvas flex min-h-dvh justify-center px-4 py-10 sm:items-center">
            <div className="border-border bg-card h-fit w-full max-w-[440px] rounded-2xl border p-6 sm:p-8">
                {children}
            </div>
        </main>
    );
}

/**
 * 인가 요청이 없거나 이미 지난 자리.
 *
 * ⚠ **무엇이 어긋났는지 자세히 적지 않는다.** 만료된 것과 없는 것과 남의 것을 구분해 주면 바깥에서 그 셋을
 *    가려낼 수 있다. 사람이 할 일은 어느 경우든 같다. 원래 앱에서 다시 시작하는 것이다.
 */
function Gone()
{
    return (
        <ConsentFrame>
            <div className="flex flex-col items-center gap-1 text-center">
                <Mark>{initialOf(BRAND.strong)}</Mark>
                <h1 className="mt-5 text-lg font-bold">연결 요청을 찾을 수 없어요</h1>
                <p className="text-muted-foreground text-sm leading-6">
                    연결하려던 앱에서 다시 시작해 주세요.
                </p>
            </div>
        </ConsentFrame>
    );
}

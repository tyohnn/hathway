import Link from "next/link";

import { PendingText } from "@hathway/blocks/pending";
import { buttonVariants } from "@hathway/ui/components/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@hathway/ui/components/card";

import type { TeamSummary } from "@/usecases/team";

import { FactList } from "../../_components/FactList";
import { Figures, Meter } from "../../_components/Meter";
import { ROLE_LABELS } from "../../_components/roles";
import { shareOf } from "../../_components/share";

import { InviteForm } from "./InviteForm";
import { MemberTable } from "./MemberTable";
import type { MemberLine } from "./roster";

/** 팀 화면의 본문이 그리는 것. 서버 조각(`TeamView`)이 조회에서 빚는다 */
export interface TeamScreen
{
    readonly lines: ReadonlyArray<MemberLine>;
    readonly canManage: boolean;
    readonly summary: TeamSummary;
    /** 이 사람이 멤버 한도를 올리러 갈 주소. 올릴 수 없으면 `null` 이고 링크가 서지 않는다 */
    readonly upgradeHref: string | null;
}

interface TeamBodyProps
{
    readonly screen?: TeamScreen;
    readonly loading?: boolean;
}

/**
 * 멤버 표와 옆 카드. 읽는 쪽(`TeamView`)과 기다리는 얼굴(`loading`)이 같은 틀을 쓴다.
 *
 * ⚠ **초대 카드는 옆 기둥의 맨 아래에 선다.** 관리할 수 있는 사람에게만 서는 카드라 누구인지 알기 전에는 세우지 못한다.
 *    위에 두면 값이 오는 순간 표와 카드가 아래로 밀린다. 맨 아래에 두면 아무것도 움직이지 않는다.
 * ⚠ 표의 칸은 줄어들 수 있어야 한다(`grid-cols-1` · `minmax(0, 1fr)`). 없으면 넓은 표가 옆 기둥을 화면 밖으로 민다.
 *    좁은 화면(`xl` 아래)에서는 옆 기둥이 표 아래로 내려간다.
 */
export function TeamBody({ screen, loading = false }: TeamBodyProps)
{
    const waiting = loading || screen === undefined;

    return (
        <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <MemberTable {...(screen === undefined ? {} : { lines: screen.lines, canManage: screen.canManage })} loading={waiting} />
            <div className="flex min-w-0 flex-col gap-4">
                <SeatsCard {...(screen === undefined ? {} : { summary: screen.summary, upgradeHref: screen.upgradeHref })} />
                <RolesCard {...(screen === undefined ? {} : { summary: screen.summary })} />
                {screen?.canManage === true ? <InviteForm /> : null}
            </div>
        </div>
    );
}

interface SeatsCardProps
{
    readonly summary?: TeamSummary;
    readonly upgradeHref?: string | null;
}

const people = (count: number): string => `${count}명`;

/**
 * 인원. 멤버 한도가 있으면 한도 가운데 얼마를 썼는지 막대로 보이고, 없으면 인원만 센다.
 *
 * ⚠ **초대만 받은 사람도 자리를 쓴다.** 그래서 「참여 중」과 「초대됨」을 따로 적는다. 셋(참여 중 · 초대됨 · 남음)을 더하면 한도다.
 *    들어온 사람을 「멤버」라 적지 않는다. 표의 머리가 초대만 받은 사람까지 「멤버 N명」으로 세어서 두 수가 어긋나 보인다.
 * ⚠ 기다리는 얼굴에는 빈 막대가 선다. 한도가 있는 팀이 보통이라 그쪽에 맞췄고, 한도가 없는 팀은 값이 오면 막대가 걷힌다.
 * ⚠ 한도를 올리러 가는 링크는 그 주소를 받은 사람에게만 선다. 결제를 못 하는 사람을 요금제 화면으로 보내면 막다른 길이다.
 */
function SeatsCard({ summary, upgradeHref = null }: SeatsCardProps)
{
    const waiting = summary === undefined;
    const seats = summary?.seats ?? null;
    const figure = (count: number | undefined) => (count === undefined ? <PendingText length={1} /> : count);

    return (
        <Card size="sm" aria-busy={waiting || undefined}>
            <CardHeader>
                <CardTitle>인원</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
                {waiting
                    ? <Meter label={<PendingText length={10} />} loading />
                    : seats === null ? null : <Meter label={`${people(seats.max)} 중 ${people(summary.total)}`} percent={shareOf(summary.total, seats.max)} />}
                <Figures
                    items={[
                        { label: "참여 중", value: figure(summary?.joined) },
                        { label: "초대됨", value: figure(summary?.invited) },
                        ...(waiting || seats !== null ? [{ label: "남음", value: figure(seats?.left) }] : []),
                    ]}
                />
            </CardContent>
            {seats !== null && upgradeHref !== null
                ? (
                    <CardFooter>
                        <Link data-slot="button" className={buttonVariants({ variant: "outline", size: "sm" })} href={upgradeHref}>요금제 보기</Link>
                    </CardFooter>
                )
                : null}
        </Card>
    );
}

/** 역할마다 몇 명인가. 보기만 한다. 역할을 바꾸는 자리는 표의 줄이다 */
function RolesCard({ summary }: { readonly summary?: TeamSummary })
{
    const count = (role: keyof typeof ROLE_LABELS) => (summary === undefined ? <PendingText length={2} /> : people(summary.roles[role]));

    return (
        <Card size="sm" aria-busy={summary === undefined || undefined}>
            <CardHeader>
                <CardTitle>역할</CardTitle>
            </CardHeader>
            <CardContent>
                <FactList
                    facts={[
                        { label: ROLE_LABELS.owner, value: count("owner") },
                        { label: ROLE_LABELS.admin, value: count("admin") },
                        { label: ROLE_LABELS.member, value: count("member") },
                    ]}
                />
            </CardContent>
        </Card>
    );
}

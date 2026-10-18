import { PendingText } from "@hathway/blocks/pending";
import { Card, CardContent } from "@hathway/ui/components/card";

import type { MyAccount } from "@/usecases/team";

import { FactList, type Fact } from "../../_components/FactList";
import { PanelCard } from "../../_components/PanelCard";
import { PersonAvatar } from "../../_components/Person";
import { ROLE_LABELS } from "../../_components/roles";

import { RenameForm } from "./RenameForm";

interface AccountBodyProps
{
    /** `google` 은 Google 계정으로 들어왔는가. 주소 아래 한 줄이 그에 맞게 선다 */
    readonly account?: MyAccount & { readonly google: boolean };
    readonly loading?: boolean;
}

/**
 * 내 계정의 본문. 프로필 · 이름 바꾸기 · 소속 세 장이 한 줄로 선다. 읽는 쪽(`AccountView`)과 기다리는 얼굴(`loading`)이
 * 같은 틀을 쓴다.
 *
 * ⚠ **이름이 없는 사람은 이메일이 이름 자리에 선다.** 초대받아 처음 들어온 사람이다. 그때는 이메일을 한 번 더 적지 않는다.
 * ⚠ **주소 아래 한 줄은 들어온 길에 맞춘다.** 이메일과 비밀번호로 들어온 사람에게 Google 계정이라고 적으면 틀린 말이다.
 * ⚠ **역할은 지금 들어온 팀의 것이다.** 다른 팀은 이름만 적는다. 그 팀에서의 역할은 그 팀으로 들어와야 선다.
 * ⚠ 「다른 팀」 줄은 여러 팀에 속한 사람에게만 선다. 하나뿐인 사람에게 빈 줄을 세우지 않는다. 맨 아래 줄이라 값이 와도
 *    위의 것이 움직이지 않는다.
 */
export function AccountBody({ account, loading = false }: AccountBodyProps)
{
    const waiting = loading || account === undefined;
    const named = account !== undefined && account.name !== null && account.name !== "";
    const facts: ReadonlyArray<Fact> = account === undefined
        ? [
            { label: "팀", value: <PendingText length={5} /> },
            { label: "역할", value: <PendingText length={3} /> },
        ]
        : [
            ...(account.team === null ? [] : [{ label: "팀", value: account.team }]),
            { label: "역할", value: ROLE_LABELS[account.role] },
            ...(account.otherTeams.length === 0 ? [] : [{ label: "다른 팀", value: account.otherTeams.join(" · ") }]),
        ];

    return (
        <div className="flex max-w-3xl flex-col gap-4">
            <Card aria-busy={waiting || undefined}>
                <CardContent className="flex items-center gap-4">
                    <PersonAvatar
                        size="xl"
                        {...(account === undefined ? {} : { name: named ? account.name ?? "" : account.email, toneKey: account.email })}
                        loading={waiting}
                    />
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="st-figure-lg st-truncate">
                            {account === undefined ? <PendingText length={4} /> : named ? account.name : account.email}
                        </span>
                        {account === undefined
                            ? <span className="text-muted-foreground"><PendingText length={14} /></span>
                            : named ? <span className="text-muted-foreground st-truncate">{account.email}</span> : null}
                        <span className="st-meta">
                            {account === undefined ? <PendingText length={14} /> : account.google ? "로그인한 Google 계정의 주소예요." : "로그인할 때 쓰는 주소예요."}
                        </span>
                    </div>
                </CardContent>
            </Card>

            <RenameForm account={account === undefined ? null : { name: account.name ?? "" }} />

            <PanelCard title="소속" busy={waiting}>
                <FactList facts={facts} />
            </PanelCard>
        </div>
    );
}

"use client";

import { useState, useTransition } from "react";

import type { MembershipRole } from "@investment/access/domain/AppAudience";
import { Button } from "@investment/ui/components/button";
import { NativeSelect, NativeSelectOption } from "@investment/ui/components/native-select";

import { changeRoleAction, removeMemberAction } from "@/actions/team";

import { ROLE_LABELS } from "./roles";

/**
 * 한 사람의 역할을 고르고 팀에서 빼는 단추. 판정이 거절할 줄에는 서지 않는다(`TeamList`).
 *
 * ⚠ **바꾸기 전 역할(`role`)을 함께 보낸다.** 그사이 다른 사람이 바꿨으면 덮어쓰지 않고 새로고침을 권한다.
 * ⚠ **「내보내기」라 하지 않는다.** 설정 화면에서는 파일 내보내기로 읽힌다.
 * ⚠ **팀에서 빼기에 확인 창이 없다.** 다시 초대하면 같은 멤버십이 되살아나 되돌릴 수 있는 일이다(`ux-writing`
 *    「자리별 규칙」: 되돌릴 수 없는 일만 확인 창을 띄운다).
 */
export function MemberControls({ membershipId, role, who }: {
    readonly membershipId: string;
    readonly role: MembershipRole;
    readonly who: string;
})
{
    const [pending, start] = useTransition();
    const [message, setMessage] = useState<string | null>(null);

    const change = (to: string): void =>
    {
        start(async () =>
        {
            const result = await changeRoleAction({ membershipId, from: role, to: to === "admin" ? "admin" : "member" });

            setMessage(result.ok ? null : result.message);
        });
    };

    const remove = (): void =>
    {
        start(async () =>
        {
            const result = await removeMemberAction({ membershipId });

            setMessage(result.ok ? null : result.message);
        });
    };

    return (
        <div className="flex items-center gap-2">
            {message === null ? null : <span role="alert" className="text-destructive text-sm">{message}</span>}
            <NativeSelect
                aria-label={`${who} 역할`}
                size="sm"
                value={role}
                disabled={pending}
                onChange={(event) => change(event.target.value)}
            >
                <NativeSelectOption value="member">{ROLE_LABELS.member}</NativeSelectOption>
                <NativeSelectOption value="admin">{ROLE_LABELS.admin}</NativeSelectOption>
            </NativeSelect>
            <Button variant="ghost" size="sm" disabled={pending} onClick={remove} aria-label={`${who} 팀에서 빼기`}>
                팀에서 빼기
            </Button>
        </div>
    );
}

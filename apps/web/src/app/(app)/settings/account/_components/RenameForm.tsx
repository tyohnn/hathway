"use client";

import { useState, useTransition } from "react";

import { Button } from "@hathway/ui/components/button";
import { Field, FieldError, FieldLabel } from "@hathway/ui/components/field";
import { Input } from "@hathway/ui/components/input";

import { renameAction } from "@/actions/team";

import { PanelCard } from "../../_components/PanelCard";

/**
 * 내 이름을 바꾸는 카드. 계정은 서버가 행위자에게서 읽는다. 폼에 계정 칸을 두면 남의 이름을 바꾸는 길이 생긴다.
 *
 * ⚠ **계정이 오기 전(`account === null`)에도 같은 카드로 선다.** 라벨 · 단추는 그대로이고 칸과 단추만 꺼져 있다.
 *    따로 그린 뼈대를 두지 않는다(`CLAUDE.md` 「정적 껍데기」).
 * ⚠ **이메일은 이 폼에 없다.** 고칠 수 없는 값이라 위의 프로필 카드가 글자로 적는다. 꺼진 칸으로 세우면 고칠 수 있는데
 *    막힌 것으로 읽힌다.
 * ⚠ 아래 줄 왼쪽의 글은 늘 서 있는 `status` 다. 저장하면 「저장했어요.」가 들어오고 칸을 다시 고치면 비운다. 저장하지 않은
 *    값을 두고 저장했다고 말하지 않는다.
 */
export function RenameForm({ account }: { readonly account: { readonly name: string } | null })
{
    const waiting = account === null;
    const [pending, start] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    const submit = (formData: FormData): void =>
    {
        start(async () =>
        {
            const result = await renameAction({ name: String(formData.get("name") ?? "") });

            setSaved(result.ok);
            setError(result.ok ? null : result.message);
        });
    };

    return (
        <form action={submit} aria-busy={waiting || undefined}>
            <PanelCard
                footer={(
                    <>
                        <span role="status" className="st-meta">{saved ? "저장했어요." : null}</span>
                        <Button type="submit" size="sm" disabled={pending || waiting}>{pending ? "저장하는 중" : "저장하기"}</Button>
                    </>
                )}
            >
                <Field data-invalid={error !== null || undefined} className="max-w-sm">
                    <FieldLabel htmlFor="account-name">이름</FieldLabel>
                    <Input id="account-name" name="name" defaultValue={account?.name ?? ""} disabled={waiting} autoComplete="name" maxLength={50} onChange={() => setSaved(false)} />
                    {error === null ? null : <FieldError>{error}</FieldError>}
                </Field>
            </PanelCard>
        </form>
    );
}

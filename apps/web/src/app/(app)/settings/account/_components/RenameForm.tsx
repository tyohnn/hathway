"use client";

import { useState, useTransition } from "react";

import { Button } from "@investment/ui/components/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@investment/ui/components/field";
import { Input } from "@investment/ui/components/input";

import { renameAction } from "@/actions/team";

/**
 * 내 이름을 바꾸는 폼. 계정은 서버가 행위자에게서 읽는다. 폼에 계정 칸을 두면 남의 이름을 바꾸는 길이 생긴다.
 *
 * ⚠ **계정이 오기 전(`account === null`)에도 같은 폼으로 선다.** 라벨 · 도움말 · 단추는 그대로이고 칸과 단추만 꺼져 있다.
 *    따로 그린 뼈대를 두지 않는다.
 */
export function RenameForm({ account }: { readonly account: { readonly email: string; readonly name: string } | null })
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
        <form action={submit} aria-busy={waiting || undefined} className="flex max-w-xl flex-col gap-4">
            <FieldGroup>
                <Field data-invalid={error !== null || undefined}>
                    <FieldLabel htmlFor="account-name">이름</FieldLabel>
                    <Input id="account-name" name="name" defaultValue={account?.name ?? ""} disabled={waiting} autoComplete="name" maxLength={50} onChange={() => setSaved(false)} />
                    {error === null ? null : <FieldError>{error}</FieldError>}
                </Field>
                <Field>
                    <FieldLabel htmlFor="account-email">이메일</FieldLabel>
                    <Input id="account-email" value={account?.email ?? ""} disabled={waiting} readOnly />
                    <FieldDescription>로그인한 계정의 주소예요. 여기서는 바꿀 수 없어요.</FieldDescription>
                </Field>
            </FieldGroup>
            {saved ? <p role="status" className="text-muted-foreground text-sm">저장했어요.</p> : null}
            <div>
                <Button type="submit" disabled={pending || waiting}>{pending ? "저장하는 중" : "저장하기"}</Button>
            </div>
        </form>
    );
}

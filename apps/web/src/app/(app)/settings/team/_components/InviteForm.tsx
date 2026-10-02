"use client";

import { useState, useTransition } from "react";

import { Button } from "@investment/ui/components/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@investment/ui/components/field";
import { Input } from "@investment/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@investment/ui/components/native-select";

import { inviteAction } from "@/actions/team";

import { ROLE_LABELS } from "./roles";

/**
 * 한 사람을 초대하는 폼. 메일은 보내지 않는다. 명부에 그 주소를 세우면, 그 주소의 Google 계정이 처음 로그인할 때
 * 이어진다(INV-ACCESS-08). 「초대했어요」만 적으면 메일이 간 것으로 읽히므로, 초대한 사람이 직접 알려야 한다고 적는다.
 *
 * ⚠ **테넌트는 폼에 없다.** 서버가 행위자에게서 읽는다. 역할에 소유자는 없다(INV-ACCESS-10).
 */
export function InviteForm()
{
    const [pending, start] = useTransition();
    const [error, setError] = useState<{ readonly field?: string; readonly message: string } | null>(null);
    const [invited, setInvited] = useState<string | null>(null);
    const [formKey, setFormKey] = useState(0);

    const submit = (formData: FormData): void =>
    {
        const email = String(formData.get("email") ?? "");

        start(async () =>
        {
            const result = await inviteAction({ email, role: formData.get("role") === "admin" ? "admin" : "member" });

            if (result.ok)
            {
                setError(null);
                setInvited(email.trim());
                setFormKey((key) => key + 1);

                return;
            }

            setInvited(null);
            setError(result);
        });
    };

    return (
        <form key={formKey} action={submit} className="flex max-w-xl flex-col gap-4">
            <FieldGroup className="grid gap-4 sm:grid-cols-[1fr_10rem]">
                <Field data-invalid={error?.field === "email" || undefined}>
                    <FieldLabel htmlFor="invite-email">이메일</FieldLabel>
                    <Input id="invite-email" name="email" type="email" autoComplete="off" maxLength={254} required />
                    {error?.field === "email" ? <FieldError>{error.message}</FieldError> : null}
                </Field>
                <Field>
                    <FieldLabel htmlFor="invite-role">역할</FieldLabel>
                    <NativeSelect id="invite-role" name="role" defaultValue="member">
                        <NativeSelectOption value="member">{ROLE_LABELS.member}</NativeSelectOption>
                        <NativeSelectOption value="admin">{ROLE_LABELS.admin}</NativeSelectOption>
                    </NativeSelect>
                </Field>
            </FieldGroup>
            {error !== null && error.field === undefined ? (
                <p role="alert" className="text-destructive text-sm">{error.message}</p>
            ) : null}
            {invited === null ? null : (
                <FieldDescription role="status">초대했어요. 메일은 가지 않으니 {invited}에게 Google 계정으로 로그인하라고 알려 주세요.</FieldDescription>
            )}
            <div>
                <Button type="submit" disabled={pending}>{pending ? "초대하는 중" : "초대하기"}</Button>
            </div>
        </form>
    );
}

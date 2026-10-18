"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@hathway/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@hathway/ui/components/field";
import { Input } from "@hathway/ui/components/input";
import { NativeSelect, NativeSelectOption } from "@hathway/ui/components/native-select";
import { Textarea } from "@hathway/ui/components/textarea";

import { createNoteAction } from "@/actions/notes";
import { paths } from "@/lib/paths";

/**
 * 새 쪽지를 쓰는 폼. 받은 값은 관문(`appAction`)이 다시 파싱하고, 뜻은 `draftNote` 가 다시 본다.
 *
 * ⚠ **테넌트와 쓴 사람은 폼에 없다.** 그 둘은 서버가 행위자에게서 읽는다. 폼에 칸을 두면 남의 테넌트에
 *    쪽지를 심는 길이 생긴다.
 * ⚠ **다이얼로그와 전체 페이지가 같은 폼이다.** 쓰고 나면 어느 쪽이든 목록(`/notes`)으로 간다. 다이얼로그는 그 이동으로 닫히고
 *    (`../layout.tsx`), 새 쪽지는 목록 맨 위에 선다. 주소를 바꾸는(`replace`) 까닭은 뒤로 가기로 빈 폼이 다시 열리지 않게 하려는 것이다.
 */
export function NewNoteForm()
{
    const [pending, start] = useTransition();
    const [error, setError] = useState<{ readonly field?: string; readonly message: string } | null>(null);
    const router = useRouter();

    const submit = (formData: FormData): void =>
    {
        start(async () =>
        {
            const result = await createNoteAction({
                title: String(formData.get("title") ?? ""),
                body: String(formData.get("body") ?? ""),
                visibility: formData.get("visibility") === "private" ? "private" : "tenant",
            });

            if (result.ok)
            {
                router.replace(paths.notes());

                return;
            }

            setError(result);
        });
    };

    return (
        <form action={submit} aria-label="새 쪽지" className="flex max-w-xl flex-col gap-4">
            <FieldGroup>
                <Field data-invalid={error?.field === "title" || undefined}>
                    <FieldLabel htmlFor="note-title">제목</FieldLabel>
                    <Input id="note-title" name="title" autoComplete="off" autoFocus />
                    {error?.field === "title" ? <FieldError>{error.message}</FieldError> : null}
                </Field>
                <Field data-invalid={error?.field === "body" || undefined}>
                    <FieldLabel htmlFor="note-body">내용</FieldLabel>
                    <Textarea id="note-body" name="body" rows={3} />
                    {error?.field === "body" ? <FieldError>{error.message}</FieldError> : null}
                </Field>
                <Field>
                    <FieldLabel htmlFor="note-visibility">공개 범위</FieldLabel>
                    <NativeSelect id="note-visibility" name="visibility" defaultValue="tenant">
                        <NativeSelectOption value="tenant">조직 전체</NativeSelectOption>
                        <NativeSelectOption value="private">나만</NativeSelectOption>
                    </NativeSelect>
                </Field>
            </FieldGroup>
            {error !== null && error.field === undefined ? <p role="alert" className="text-destructive text-sm">{error.message}</p> : null}
            <div>
                <Button type="submit" disabled={pending}>{pending ? "쓰는 중" : "쪽지 쓰기"}</Button>
            </div>
        </form>
    );
}

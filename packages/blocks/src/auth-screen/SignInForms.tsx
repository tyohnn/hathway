"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@investment/ui/components/button";
import { Field, FieldLabel } from "@investment/ui/components/field";
import { Input } from "@investment/ui/components/input";

import { GoogleMark } from "../google-mark";
import { LOGIN_PANEL_LABELS } from "./labels";
import type { FormAction, LoginPanelLabels } from "./types";

/**
 * 로그인 단추 둘. **클라이언트 경계는 「보내는 중」을 그리기 위한 것뿐이다.**
 *
 * ⚠ 액션은 앱의 서버에 있고 이 블록은 그것을 form 의 action 으로 건넨다. 비밀번호가 클라이언트 상태로
 *    올라가지 않게 하려는 것이다 — `useState` 로 들고 있으면 그 값이 리액트 트리에 남는다.
 * ⚠ **블록은 그 액션이 무엇을 하는지 모른다.** 돌아갈 주소만 숨은 칸으로 실어 준다.
 */
function SubmitButton(
    { children, pending, variant }: {
        readonly children: React.ReactNode;
        readonly pending: string;
        readonly variant?: "default" | "outline";
    },
)
{
    const status = useFormStatus();

    return (
        <Button type="submit" variant={variant ?? "outline"} className="w-full" disabled={status.pending}>
            {status.pending ? pending : children}
        </Button>
    );
}

export function GoogleSignIn(
    { redirectTo, action, labels }: {
        readonly redirectTo: string;
        readonly action: FormAction;
        readonly labels?: Partial<LoginPanelLabels>;
    },
)
{
    const text = { ...LOGIN_PANEL_LABELS, ...labels };

    return (
        <form action={action} className="mt-4">
            <input type="hidden" name="redirect" value={redirectTo} />
            <SubmitButton pending={text.googlePending}>
                <GoogleMark />
                {text.google}
            </SubmitButton>
        </form>
    );
}

/**
 * 로컬 계정. **부르는 쪽이 세울지 정한다.**
 *
 * ⚠ 화면에서 감추는 것으로는 부족하므로 앱의 서버 액션도 배포에서 스스로 거절한다.
 */
export function PasswordSignIn(
    { redirectTo, action, labels }: {
        readonly redirectTo: string;
        readonly action: FormAction;
        readonly labels?: Partial<LoginPanelLabels>;
    },
)
{
    const text = { ...LOGIN_PANEL_LABELS, ...labels };

    return (
        <form action={action} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="redirect" value={redirectTo} />
            <Field>
                <FieldLabel htmlFor="email">{text.email}</FieldLabel>
                <Input id="email" name="email" type="email" autoComplete="username" required />
            </Field>
            <Field>
                <FieldLabel htmlFor="password">{text.password}</FieldLabel>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </Field>
            <SubmitButton variant="default" pending={text.submitPending}>{text.submit}</SubmitButton>
        </form>
    );
}

import { LOGIN_PANEL_LABELS } from "./labels";
import { GoogleSignIn, PasswordSignIn } from "./SignInForms";
import type { LoginPanelLabels, LoginPanelProps } from "./types";

/**
 * 로그인 화면의 왼쪽 아래 — 돌아갈 주소와 어긋남이 서는 자리.
 *
 * ⚠ **요청 시점 값을 여기서 읽지 않는다.** 블록은 Next 를 모르므로 `searchParams` 도 `connection()` 도
 *    앱의 것이다. 앱이 주소에서 꺼내 `redirectTo` 와 `error` 로 넘기고, 그 조각을 `<Suspense>` 안쪽에
 *    두는 것도 앱이 한다 — `cacheComponents` 아래에서 경계 밖에서 읽으면 라우트가 통째로 blocking 이 된다.
 *
 * ⚠ **로컬 계정 칸의 판정도 앱의 것이다.** 블록은 받은 값만 그린다.
 */
export function LoginPanel(
    { redirectTo, error, localAccounts, onGoogleSignIn, onPasswordSignIn, labels }: LoginPanelProps,
)
{
    const text: LoginPanelLabels = { ...LOGIN_PANEL_LABELS, ...labels };

    return (
        <div className="mt-10">
            {error === null
                ? <h2 className="text-base font-bold">{text.heading}</h2>
                : (
                    <div role="alert" className="flex flex-col gap-1">
                        <h2 className="text-base font-bold">{text.messages[error].title}</h2>
                        <p className="text-muted-foreground text-sm leading-6">{text.messages[error].body}</p>
                    </div>
                )}

            <GoogleSignIn redirectTo={redirectTo} action={onGoogleSignIn} labels={labels} />

            {localAccounts
                ? (
                    <div className="mt-8 flex flex-col">
                        <h2 className="text-base font-bold">{text.localHeading}</h2>
                        <PasswordSignIn redirectTo={redirectTo} action={onPasswordSignIn} labels={labels} />
                    </div>
                )
                : null}
        </div>
    );
}

/** 기다리는 동안. 제목은 같은 자리에 서고 단추 자리만 비어 있다 */
export function LoginPanelSkeleton({ labels }: { readonly labels?: Partial<LoginPanelLabels> })
{
    const text = { ...LOGIN_PANEL_LABELS, ...labels };

    return (
        <div className="mt-10">
            <h2 className="text-base font-bold">{text.heading}</h2>
            <div className="bg-skeleton mt-4 h-11 w-full rounded-lg" />
        </div>
    );
}

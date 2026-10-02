import type React from "react";

/**
 * 로그인 화면이 드러내는 어긋남 둘.
 *
 * 허용되지 않은 계정은 여기가 아니라 별도의 한 장이 맡는다 — 그 사람은 로그인을 마쳤고, 다시 누를
 * 단추가 아니라 다음에 할 일을 읽어야 한다.
 */
export type LoginError = "failed" | "credentials";

/** form 의 action 에 그대로 실리는 서버 액션. 블록은 그것이 무엇을 하는지 모른다 */
export type FormAction = (formData: FormData) => void | Promise<void>;

export interface AuthScreenProps
{
    /** 왼쪽 위 제목. 굵게 나오는 앞말과 보통으로 나오는 뒷말 */
    readonly brand: { readonly strong: string; readonly rest: string };
    /** 제목 아래 한두 줄. 로그인 판이 이미 할 일을 말하면 두지 않는다 */
    readonly description?: React.ReactNode;
    /** 오른쪽 판. 앱마다 다른 그림이고, 없으면 왼쪽만 선다 */
    readonly showcase?: React.ReactNode;
    readonly children: React.ReactNode;
}

export interface LoginPanelProps
{
    /** 로그인을 마친 뒤 돌아갈 주소. 앱이 검사를 지나 넘긴다 */
    readonly redirectTo: string;
    /** 주소에 실려 온 어긋남. 없으면 `null` */
    readonly error: LoginError | null;
    /**
     * 로컬 계정 칸을 세울지.
     *
     * ⚠ **판정은 앱의 것이다.** 블록은 그 규칙을 모르고 받은 값만 그린다. 화면에서 감추는 것으로는
     *    부족하므로 앱의 서버 액션도 같은 규칙을 다시 본다.
     */
    readonly localAccounts: boolean;
    readonly onGoogleSignIn: FormAction;
    readonly onPasswordSignIn: FormAction;
    readonly labels?: Partial<LoginPanelLabels>;
}

export interface LoginPanelLabels
{
    readonly heading: string;
    readonly google: string;
    readonly googlePending: string;
    readonly localHeading: string;
    readonly email: string;
    readonly password: string;
    readonly submit: string;
    readonly submitPending: string;
    readonly messages: Record<LoginError, { readonly title: string; readonly body: string }>;
}

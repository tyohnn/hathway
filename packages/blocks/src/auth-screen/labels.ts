import type { LoginPanelLabels } from "./types";

export const LOGIN_PANEL_LABELS: LoginPanelLabels = {
    heading: "로그인",
    google: "Google 계정으로 로그인",
    googlePending: "Google 계정을 확인하는 중",
    localHeading: "로컬 계정으로 로그인",
    email: "이메일",
    password: "비밀번호",
    submit: "로그인",
    submitPending: "확인하는 중",
    messages: {
        failed: {
            title: "로그인하지 못했어요",
            body: "잠시 뒤 다시 시도해 주세요.",
        },
        credentials: {
            title: "이메일이나 비밀번호가 맞지 않아요",
            body: "다시 입력해 주세요.",
        },
    },
};

/** 주소에 실려 온 값을 어휘로 좁힌다. 사람이 무엇이든 적을 수 있다 */
export const loginErrorOf = (value: unknown): "failed" | "credentials" | null =>
    value === "failed" || value === "credentials" ? value : null;

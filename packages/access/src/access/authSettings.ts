/**
 * 인증 서버의 공개 설정(`/auth/v1/settings`)을 읽는다.
 *
 * 첫 로그인은 확인된 주소로 명부의 계정을 잇는다(INV-ACCESS-08). 그런데 이메일 확인이 꺼진 프로젝트에서는
 * 비밀번호 가입이 메일을 거치지 않고 확인된 것으로 서서, 확인 시각이 그 주소의 주인이라는 증거가 되지
 * 못한다. 그 설정은 대시보드의 토글 하나라 누가 끄더라도 코드가 알 수 있도록 잇기 직전에 이 값을 본다.
 *
 * ⚠ **확인이 켜졌다고 확실할 때만 `true` 다.** 칸이 없거나 값이 불리언이 아니면 꺼진 것으로 읽는다.
 *    응답의 모양이 바뀐 날 조용히 안전하다고 여기면 막으려던 길이 그대로 열린다.
 */
export const emailConfirmationEnforced = (settings: unknown): boolean =>
    typeof settings === "object"
    && settings !== null
    && (settings as { mailer_autoconfirm?: unknown }).mailer_autoconfirm === false;

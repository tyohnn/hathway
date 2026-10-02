import { assert, describe, it } from "vitest";

import { emailConfirmationEnforced } from "./authSettings.ts";

describe("인증 서버의 공개 설정", () =>
{
    it("mailer_autoconfirm 이 false 이면 이메일 확인이 켜진 것으로 읽는다", () =>
    {
        assert.isTrue(emailConfirmationEnforced({ disable_signup: false, mailer_autoconfirm: false }));
    });

    it("mailer_autoconfirm 이 true 이면 꺼진 것으로 읽는다 — 가입만으로 확인 시각이 찬다", () =>
    {
        assert.isFalse(emailConfirmationEnforced({ disable_signup: false, mailer_autoconfirm: true }));
    });

    it("칸이 없거나 값이 불리언이 아니면 꺼진 것으로 읽는다 — 읽지 못한 것을 안전하다고 여기지 않는다", () =>
    {
        for (const unreadable of [{}, { mailer_autoconfirm: "false" }, { mailer_autoconfirm: null }, null, "false", []])
        {
            assert.isFalse(emailConfirmationEnforced(unreadable), JSON.stringify(unreadable));
        }
    });
});

import { describe, expect, it } from "vitest";

import type { MemberRow } from "@hathway/access/ports/TeamDirectory";

import { authorLabel } from "./noteDetail";

/**
 * 쪽지 상세의 속성 기둥에 쓴 사람을 무엇으로 적는가. 계정 id 를 그대로 적지 않는다.
 */
const member = (accountId: string, name: string | null): MemberRow => ({
    membershipId: `m${accountId}`,
    accountId,
    tenantId: "2",
    role: "member",
    email: `${accountId}@example.test`,
    name,
    pending: false,
});

describe("쪽지를 쓴 사람", () =>
{
    it("내가 쓴 쪽지는 「나」로 적는다", () =>
    {
        expect(authorLabel("2", "2", [member("2", "김고객")])).toBe("나");
    });

    it("같은 조직 사람은 이름으로, 이름이 없으면 메일 주소로 적는다", () =>
    {
        const members = [member("2", "김고객"), member("3", "이고객"), member("9", null)];

        expect(authorLabel("2", "3", members)).toBe("이고객");
        expect(authorLabel("2", "9", members)).toBe("9@example.test");
    });

    it("명부에 없는 사람은 「팀을 떠난 사람」으로 적는다. 떠난 사람이 남긴 쪽지도 화면이 깨지지 않는다", () =>
    {
        expect(authorLabel("2", "7", [member("2", "김고객")])).toBe("팀을 떠난 사람");
    });
});

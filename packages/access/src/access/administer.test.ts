import { describe, expect, it } from "vitest";

import { customerAdminActor, operatorActor } from "../testing/actor.ts";
import { canAdministerOrg } from "./administer.ts";

describe("운영 도구를 고칠 자격", () =>
{
    it("운영 소유주는 운영 도구를 고친다", () =>
    {
        expect(canAdministerOrg(operatorActor("4", { role: "owner" }))).toBe(true);
    });

    it("운영 관리자는 운영 도구를 고친다", () =>
    {
        expect(canAdministerOrg(operatorActor("5", { role: "admin" }))).toBe(true);
    });

    it("INV-ACCESS-05 운영 구성원은 문을 지나도 운영 도구를 고치지 못한다", () =>
    {
        expect(canAdministerOrg(operatorActor("4"))).toBe(false);
    });

    it("고객사의 관리자는 운영 도구를 고치지 못한다. 자기 조직의 관리자일 뿐이다", () =>
    {
        expect(canAdministerOrg(customerAdminActor("5"))).toBe(false);
    });
});

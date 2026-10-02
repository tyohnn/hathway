import type { MembershipRole } from "@investment/access/domain/AppAudience";

/** 역할을 화면에 적는 말. 목록의 배지와 고르는 칸이 같은 말을 쓴다 */
export const ROLE_LABELS: Readonly<Record<MembershipRole, string>> = {
    owner: "소유자",
    admin: "관리자",
    member: "멤버",
};

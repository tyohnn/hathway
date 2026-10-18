import type { MembershipRole } from "@hathway/access/domain/AppAudience";

/** 역할을 화면에 적는 말. 팀 화면의 배지 · 고르는 칸과 내 계정 화면이 같은 말을 쓴다 */
export const ROLE_LABELS: Readonly<Record<MembershipRole, string>> = {
    owner: "소유자",
    admin: "관리자",
    member: "멤버",
};

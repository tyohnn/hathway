import type { MembershipRole } from "@hathway/access/domain/AppAudience";

/**
 * 멤버 표의 한 줄. 서버 조각(`TeamView`)이 명부의 줄과 판정에서 빚어 표(클라이언트)로 넘긴다.
 *
 * ⚠ **행위자를 넘기지 않는다.** 표가 알아야 하는 것은 「이 줄이 나인가」와 「이 줄을 고칠 수 있는가」 둘이고, 그 답만 싣는다.
 */
export interface MemberLine
{
    readonly membershipId: string;
    /** 이름. 초대만 받아 아직 이름이 없는 사람은 `null` 이고 이메일이 이름 자리에 선다 */
    readonly name: string | null;
    readonly email: string;
    readonly role: MembershipRole;
    /** 초대만 받고 아직 로그인하지 않았다 */
    readonly pending: boolean;
    readonly me: boolean;
    /** 역할을 바꾸고 팀에서 뺄 수 있는 줄인가. 판정이 거절할 줄은 `false` 다 */
    readonly editable: boolean;
}

/** 역할 조건. `all` 이면 거르지 않는다 */
export type RoleFilter = "all" | MembershipRole;

/**
 * 받은 줄을 검색어와 역할로 거른다. 다시 읽지 않고 받은 줄만 거른다.
 *
 * 검색어는 이름과 이메일에서 찾고 대소문자를 가리지 않는다. 빈 검색어는 거르지 않는다.
 */
export const filterMembers = (
    lines: ReadonlyArray<MemberLine>,
    { query, role }: { readonly query: string; readonly role: RoleFilter },
): ReadonlyArray<MemberLine> =>
{
    const needle = query.trim().toLowerCase();

    return lines.filter((line) =>
        (role === "all" || line.role === role)
        && (needle === "" || line.email.toLowerCase().includes(needle) || (line.name ?? "").toLowerCase().includes(needle)));
};

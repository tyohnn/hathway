import type { TenantKind } from "@investment/shared/constants/tenancy";

import type { AppAudience, MembershipRole } from "../domain/AppAudience.ts";

/**
 * 인증의 둘째 계층이고 **이 앱을 쓸 수 있는 사람인가**를 묻는다.
 *
 * 앱이 늘면 모두 같은 표(`org.membership`)를 읽는데 답은 앱마다 달라야 한다. 그 판정이 앱 안에
 * 흩어지면 규칙인지 사고인지 알 수 없게 되므로, 판정은 여기 하나이고 앱은 자기 이름만 넘겨 답을 받는다.
 *
 * ⚠ **셋째 계층(행 단위 판정)은 여기가 아니다.** 그것은 모든 조회와 쓰기마다 다시 하는 판정이다.
 *    이 함수를 지났다는 것은 **문 앞을 지났다**는 뜻일 뿐이다.
 * ⚠ **읽는 값은 서버가 `org` 에서 확정한 것이어야 한다.** 세션의 클레임을 넣으면 토큰을 쥔 사람이
 *    자기 소속을 적어 넣는 것과 같다.
 */

/**
 * 한 계정의 멤버십 하나. **판정이 아니라 사실이다**. 어댑터가 읽어 온 그대로다.
 *
 * 한 계정이 여러 테넌트에 속할 수 있어서 판정은 목록을 받는다. 운영팀이면서 고객사의 사람인 경우가
 * 있을 수 있고, 그때 계정을 둘로 나누면 감사 기록도 둘로 나뉜다.
 */
export interface TenantMembership
{
    readonly membershipId: string;
    readonly tenantId: string;
    readonly tenantKind: TenantKind;
    readonly tenantActive: boolean;
    readonly role: MembershipRole;
    readonly active: boolean;
}

/** 소속 판정에 쓰는 계정 하나의 사실 전부 */
export interface AccountFacts
{
    readonly accountId: string;
    readonly deactivated: boolean;
    readonly memberships: ReadonlyArray<TenantMembership>;
}

export type MembershipVerdict =
    | { readonly allowed: true; readonly membership: TenantMembership }
    | { readonly allowed: false; readonly reason: string };

const denied = (reason: string): MembershipVerdict => ({ allowed: false, reason });

/**
 * 어떤 앱을 어떤 테넌트가 여는지 정하는 **문의 정본**이다.
 *
 * | 앱 | 여는 테넌트 | 왜 |
 * |---|---|---|
 * | `web` | `operator` · `customer` | 제품을 쓰는 고객과 그 곁에서 일하는 운영팀이다 |
 * | `agent` | `operator` | 에이전트를 부리는 사람이다. 고객에게는 아직 열지 않는다 |
 *
 * ⚠ **플래그를 더하지 않는다.** 「이 사람이 운영팀이다」를 사람이 손으로 표시하는 칸을 두면 표시를
 *    빠뜨리거나 잘못 켜는 일이 생긴다. 테넌트는 같은 사실이 이미 데이터에 있는 것이다.
 *
 * ⚠ **고객사가 백 곳이 되어도 이 표는 바뀌지 않는다.** `customer` 테넌트의 행이 늘 뿐이다. 이 표를
 *    고쳐야 하는 때는 **새로운 종류의 조직**이 생기거나 앱이 늘 때뿐이고, 그때는 테넌트 종류를 먼저
 *    늘려야 한다.
 */
const APP_TENANTS: Record<AppAudience, ReadonlyArray<TenantKind>> =
{
    web: ["operator", "customer"],
    agent: ["operator"],
};

export interface EnterAppInput
{
    readonly app: AppAudience;
    readonly account: AccountFacts;
}

/**
 * 이 사람이 이 앱의 문을 지날 수 있는가.
 *
 * 지나면 **어느 멤버십으로 지났는지**를 함께 돌려준다. 행위자가 그 테넌트를 들고 다녀야 같은 사람이
 * 앱에 따라 다른 범위를 보기 때문이다.
 *
 * ⚠ **모르는 앱은 거절한다.** 기본값을 허용으로 두면 기획이 서기 전에 문이 먼저 열린다.
 */
export const canEnterApp = ({ app, account }: EnterAppInput): MembershipVerdict =>
{
    if (account.deactivated)
    {
        return denied("나간 사람이다");
    }

    const allowed = APP_TENANTS[app] as ReadonlyArray<TenantKind> | undefined;

    if (allowed === undefined)
    {
        return denied("모르는 앱이다");
    }

    const usable = account.memberships.filter(
        (membership) => membership.active && membership.tenantActive,
    );

    if (usable.length === 0)
    {
        return denied("어느 테넌트에도 속하지 않는다");
    }

    const match = usable.find((membership) => allowed.includes(membership.tenantKind));

    return match === undefined
        ? denied(`${app} 앱을 쓰는 테넌트에 속하지 않는다`)
        : { allowed: true, membership: match };
};

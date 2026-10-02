/**
 * 테넌트의 종류.
 *
 * 어휘를 도메인 패키지가 아니라 여기 두는 까닭은 여럿이 같은 목록을 보아야 하기 때문이다.
 * `@investment/access` 가 앱의 문을 판정하는 데 쓰고 화면이 같은 값으로 거른다.
 *
 * ⚠ **종류를 늘리는 것이 앱을 늘리는 것과 같은 무게다.** 앱마다 어떤 종류가 문을 여는지를
 *    `@investment/access` 의 표 하나가 선언하므로, 종류가 늘면 그 표를 함께 고쳐야 한다.
 * ⚠ **`org.tenant.kind` 의 CHECK 제약과 맞아야 한다.** 한쪽만 고치면 문을 여는 판정이 어긋난다.
 *
 * 스캐폴드의 두 종류는 자리표시다. 새 제품에서 이름을 바꿀 때는 이 목록과 CHECK 제약과
 * `packages/access/src/access/membership.ts` 의 표를 같은 커밋에서 고친다.
 */

/**
 * 테넌트의 종류.
 *
 * - `operator`: 이 제품을 운영하는 팀
 * - `customer`: 이 제품을 쓰는 고객 조직
 */
export const TENANT_KINDS = ["operator", "customer"] as const;

export type TenantKind = typeof TENANT_KINDS[number];

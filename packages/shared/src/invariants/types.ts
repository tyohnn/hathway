/**
 * 불변식 카탈로그의 공통 타입.
 *
 * 도메인마다 자기 불변식을 자기 패키지에 둔다(`packages/notes/src/invariants.ts` ·
 * `packages/agents/src/invariants.ts`). 그 카탈로그들이 같은 모양을 쓰게 하는 것이 이 파일이다.
 *
 * ⚠ 타입이 여기 있는 것은 도메인 패키지끼리 서로를 import 하지 않아도 되게 하려는 것이다. 각 패키지에
 *    타입을 복사하면 그것이 두 번째 사본이 된다.
 */

/** 무엇에 관한 규칙인가. */
export type InvariantKind =
    | "앱"      // 앱이 도는 동안 참이어야 하는 것
    | "데이터"  // 저장된 모양이 참이어야 하는 것
    | "요구";   // 코드가 아니라 만드는 방식에 거는 것

/** 어디가 이 규칙을 실제로 막는가. */
export type EnforcementPoint =
    | "도메인 함수"
    | "입력 검증"
    | "서버 경로"
    | "유일 인덱스"
    | "DB 제약"
    | "DB 트리거"
    | "접근 정책"
    | "사람(리뷰)";

/**
 * 지금 이 규칙이 어디까지 서 있는가. 검사 스크립트가 이 값으로 판정한다.
 *
 * 판정의 대상은 **`enforcedAt` 이 가리키는 그 지점**이지 다른 층이 아니다.
 *
 * - `enforced`  : 그 지점이 막는다. 이 id 를 인용하는 테스트가 **반드시 있어야 한다**.
 * - `planned`   : 그 지점이 아직 없다. 다른 층이 이미 막고 있을 수는 있다.
 * - `review-only`: 기계가 막지 않고 사람이 리뷰에서 본다. 인용을 요구하지 않는다.
 */
export type InvariantStatus = "enforced" | "planned" | "review-only";

export type AppName = "web" | "agent";

export interface Invariant
{
    /**
     * 인용에 쓰는 정식 id.
     *
     * 도메인 불변식은 `INV-<도메인>-<두 자리>` 다(`INV-NOTE-01` · `INV-AGENT-01`). 도메인이
     * 없는 저장소 규약은 `REQ-<두 자리>` 이고, **도메인 구간이 비어 있는 것이 곧 그 신호다.**
     */
    readonly id: string;
    /** 규칙 한 문장. 이것이 테스트 이름의 재료다. */
    readonly statement: string;
    /** 왜 이 규칙이 있는가. 대개 실제로 데어 본 자국이다. */
    readonly rationale: string;
    readonly kind: InvariantKind;
    readonly enforcedAt: EnforcementPoint;
    readonly status: InvariantStatus;
    /** 이 규칙이 걸리는 앱. 앱을 가리지 않으면 빈 배열이다. */
    readonly apps: readonly AppName[];
}

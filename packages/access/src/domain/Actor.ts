import { Schema } from "effect";

import { TENANT_KINDS } from "@investment/shared/constants/tenancy";

import { MembershipRole } from "./AppAudience.ts";

/**
 * 행위자를 이루는 값이다. 브랜드가 붙지 않아서 이것만으로는 판정에 넘기지 못한다.
 */
export const ActorFields = Schema.Struct({
    accountId: Schema.NonEmptyString,
    tenantId: Schema.NonEmptyString,
    tenantKind: Schema.Literals(TENANT_KINDS),
    role: MembershipRole,
});

export type ActorFields = typeof ActorFields.Type;

declare const ActorProof: unique symbol;

/**
 * 인증을 지난 행위자다. 판정 함수가 첫 번째로 받는 값이고 「누가 이 일을 하는가」에 답한다.
 *
 * 서버 액션이 세션과 `org` 에서 확정해 요청마다 주입한다. 한 계정이 여러 테넌트에 속할 수 있으므로
 * (운영팀이면서 고객사의 사람일 수 있다) **어느 테넌트로 들어왔는지를 함께 들고 다닌다.**
 *
 * ## ⚠ 이 값을 손으로 만들면 안 된다
 *
 * 데이터베이스는 이 질의가 누구의 것인지 모른다. 모든 요청이 앱마다 하나인 롤로 나가기 때문에, 앱이
 * 판정을 빠뜨리면 받아 줄 두 번째 방어선이 없다. 그 판정이 첫 번째로 읽는 값이 이것이라서, 액션
 * 안에서 `role` 을 `admin` 으로 적은 객체를 지어내면 전권 계정을 하나 만드는 것과 같다.
 *
 * ⚠ **이 타입에는 증거 구실을 하는 데이터가 붙어 있지 않다.** `ActorProof` 는 타입 검사기만 아는
 *    표식이고 실행 중의 행위자는 그냥 객체다. 그래서 직렬화를 한 번 거치면 표식이 사라진다. 행위자를
 *    폼 페이로드나 캐시나 클라이언트 컴포넌트의 prop 으로 내보내지 말 것.
 *
 * ⚠ **실제로 이 값을 지키는 것은 만드는 길이 하나라는 사실이다**(INV-ACCESS-04). 운영에서 행위자가
 *    생기는 곳은 `actorForApp` 하나이고 그 함수는 `canEnterApp` 을 지나야 도달한다. 그 위에서 읽는
 *    소속은 세션이 준 값이 아니라 `org.membership` 에서 읽은 행이다. 그 길이 하나로 유지되는지는
 *    `access/boundary.test.ts` 가 소스를 읽어 확인한다.
 */
export type Actor = ActorFields & { readonly [ActorProof]: true };

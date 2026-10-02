import { Context, type Effect } from "effect";

import type { LinkableAccount } from "../access/accountLink.ts";
import type { AccountFacts } from "../access/membership.ts";
import type { NotAppMember } from "./ActorResolver.ts";

/**
 * 세션으로 계정을 찾고, 찾지 못하면 주소로 찾아 잇는 포트다. 행위자를 확정하는 둘째 계층이 부른다.
 *
 * ⚠ **연산마다 메서드가 하나다.** 범용 질의를 열어 두면 앱이 조건을 적게 되고, 그러면 잇는 규칙이
 *    SQL 로 흩어진다. 잇는 판정은 `planAccountLink` 하나에 있다.
 * ⚠ **조회가 실패한 것은 `NotAppMember` 로 접는다.** 부르는 쪽이 「명부에 없다」와 「조회가 깨졌다」를
 *    갈라 답하면 그 차이가 명부를 밖에 알린다(INV-ACCESS-06). 무엇이 깨졌는지는 서버 기록이 갖는다.
 */

/**
 * 잇는 쓰기의 결과.
 *
 * - `linked`: 이번 쓰기가 붙였다
 * - `not_linked`: 그 계정의 칸이 이미 찼거나 주소가 달라져서 붙이지 않았다. 먼저 온 세션이 이긴 것이다
 * - `session_taken`: 이 세션이 이미 다른 계정에 붙어 있다. `auth_user_id` 가 유일해서 둘에 붙지 못한다
 */
export type LinkOutcome = "linked" | "not_linked" | "session_taken";

export interface LinkRequest
{
    readonly accountId: string;
    readonly authUserId: string;
    /** `planAccountLink` 가 소문자로 접은 주소. 쓰기가 이 주소로 계정을 한 번 더 확인한다 */
    readonly email: string;
}

export class AccountDirectory extends Context.Service<AccountDirectory, {
    /** 세션의 `auth.users.id` 가 붙은 계정의 소속 사실. 붙은 계정이 없으면 `null` 이다 */
    readonly factsBySession: (authUserId: string) => Effect.Effect<AccountFacts | null, NotAppMember>;
    /** 소문자로 접은 주소의 계정. 없으면 `null` 이다 */
    readonly linkableByEmail: (email: string) => Effect.Effect<LinkableAccount | null, NotAppMember>;
    /** 칸이 비어 있고 주소가 같을 때만 붙인다. 어느 쪽이든 아니면 붙이지 않고 결과로 답한다 */
    readonly link: (request: LinkRequest) => Effect.Effect<LinkOutcome, NotAppMember>;
}>()("@investment/access/ports/AccountDirectory")
{}

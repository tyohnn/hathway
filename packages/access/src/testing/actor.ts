import type { Actor, ActorFields } from "../domain/Actor.ts";

/**
 * 테스트 전용 행위자 생성자다.
 *
 * 운영에서 행위자가 생기는 곳은 `actorForApp` 하나다(`domain/Actor.ts` 를 보라). 테스트까지 그
 * 통로를 지나게 하면 케이스마다 소속 사실을 꾸며야 해서 읽기 어려워지므로, 여기에 하나를 둔다.
 *
 * ⚠ **`testing/` 밖에서 이 파일을 import 하지 말 것.** 운영 코드가 `operatorActor` 에 `admin` 을 얹어
 *    한 줄 부르면 전권 계정이 생기고, 그것이 `actorForApp` 을 건너뛰는 가장 짧은 길이다. 주석은 벽이
 *    아니므로 `boundary.test.ts` 가 `apps/**` 와 도메인 패키지의 운영 코드에서 이 경로를 읽지 않는 것을
 *    확인한다.
 *
 * 테넌트 id 는 `supabase/seed.sql` 과 같게 둔다. 운영팀이 1, 고객사 둘이 2 와 3 이다.
 */
export const actorOf = (fields: ActorFields): Actor => fields as Actor;

/**
 * 고객사 한 사람이다. 대부분의 케이스가 이 기본값에서 시작한다.
 *
 * 역할의 기본값이 `member` 인 까닭은 관리 권한을 쓰지 않는 쪽이 보통이기 때문이다.
 */
export const customerActor = (accountId: string, over: Partial<ActorFields> = {}): Actor =>
    actorOf({
        accountId,
        tenantId: "2",
        tenantKind: "customer",
        role: "member",
        ...over,
    });

/** 고객사의 관리자다 */
export const customerAdminActor = (accountId: string, over: Partial<ActorFields> = {}): Actor =>
    customerActor(accountId, { role: "admin", ...over });

/** 다른 고객사의 사람이다. 행 단위 판정이 테넌트를 가르는지 볼 때 쓴다 */
export const otherCustomerActor = (accountId: string, over: Partial<ActorFields> = {}): Actor =>
    customerActor(accountId, { tenantId: "3", ...over });

/** 운영팀 한 사람이다 */
export const operatorActor = (accountId: string, over: Partial<ActorFields> = {}): Actor =>
    actorOf({
        accountId,
        tenantId: "1",
        tenantKind: "operator",
        role: "member",
        ...over,
    });

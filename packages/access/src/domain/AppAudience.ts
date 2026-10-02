import { Schema } from "effect";

/**
 * 앱을 나누는 축은 **누가 보는가**이다.
 *
 * 루트 `CLAUDE.md` 의 「플랫폼 계층」이 정본이다. 인증과 호스트와 내비게이션과 데이터 범위가 통째로
 * 달라지는 경계가 audience 이고, 업무 영역은 앱 안의 전환이다.
 *
 * 스캐폴드에는 둘이 선다. 고객과 운영팀이 함께 쓰는 `web` 과 운영팀이 에이전트를 부리는 `agent` 다.
 * 앱이 서면 여기에 이름이 늘고 `access/membership.ts` 의 표에 줄이 는다.
 */
export const AppAudience = Schema.Literals(["web", "agent"]);

export type AppAudience = typeof AppAudience.Type;

/**
 * 테넌트 안의 역할.
 *
 * 운영 테넌트의 `owner` 와 `admin` 만 운영 도구를 고친다(`access/administer.ts`). 도메인의 판정이
 * 이 값을 읽을 때도 그 술어는 도메인 패키지의 순수 함수 하나에 둔다.
 */
export const MembershipRole = Schema.Literals(["owner", "admin", "member"]);

export type MembershipRole = typeof MembershipRole.Type;

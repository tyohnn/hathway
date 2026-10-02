// `server-only` 는 서버 컴포넌트 밖에서 불리면 던진다. 테스트는 그 조건 밖에서 돌므로 빈 모듈로 바꿔 읽는다
// (vitest.config.ts 의 alias). 이 별칭이 없으면 서버 모듈을 부르는 테스트가 import 단계에서 실패한다.
export {};

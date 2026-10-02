/**
 * 리서치 보드 쓰기 관문.
 *
 * 이 앱에는 로그인이 없어 서버 액션을 부른 사람을 가릴 수 없다. 로그인을 들이기
 * 전까지는 공개된 배포에서 쓰기를 아예 받지 않는다. 로그인을 들이는 날 이 판정을
 * 세션 검사로 바꾼다.
 */
export type BoardWriteEnv = { VERCEL_ENV?: string; NODE_ENV?: string };

export function boardWritesAllowed(env: BoardWriteEnv): boolean
{
    // Vercel 의 프리뷰·개발 배포는 Vercel 로그인 뒤에 있다. 프로덕션 별칭만 열려 있다.
    if (env.VERCEL_ENV) return env.VERCEL_ENV !== "production";
    return env.NODE_ENV !== "production";
}

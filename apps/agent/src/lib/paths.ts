import { MessageCircle } from "@hathway/ui/icons";

/**
 * 라우트를 만드는 단 한 곳.
 *
 * ⚠ **절대 경로를 문자열로 박지 않는다.** 주소 형태가 바뀌는 날 전수 검사를 하게 되고, 하나를 빠뜨리면
 *    그 링크만 조용히 깨진다. 메뉴와 리다이렉트와 알림이 조립하는 고리가 모두 이 헬퍼를 지난다.
 * ⚠ **라우트는 이 앱의 것이다.** 도메인 패키지가 주소를 알기 시작하면 앱마다 다른 화면 구조가 그리로
 *    새어 들어간다(`packages/access` 의 `entryOutcome` 이 어휘만 돌려주는 까닭과 같다).
 */
type QueryValue = string | number | undefined;

const withQuery = (path: string, query: Readonly<Record<string, QueryValue>>): string =>
{
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query))
    {
        // 빈 값을 키로 남기지 않는다. `?error=` 가 붙으면 같은 화면의 주소가 여럿이 된다
        if (value === undefined || value === "")
        {
            continue;
        }

        params.set(key, String(value));
    }

    const search = params.toString();

    return search === "" ? path : `${path}?${search}`;
};

export const paths = {
    home: (): string => "/chat",
    chat: (): string => "/chat",
    conversation: (runId: string): string => `/chat/${encodeURIComponent(runId)}`,
    /** 첫 말로 대화를 여는 창구. 화면의 전송이 부른다 */
    chatApi: (): string => "/api/chat",
    /** 도는 대화에 말을 더 거는 창구 */
    followUpApi: (runId: string): string => `/api/chat/${encodeURIComponent(runId)}`,
    /** 끊긴 턴에 다시 붙는 창구. `turnStart` 는 그 턴이 시작하는 스트림 조각의 번호다 */
    streamApi: (runId: string, turnStart: number): string =>
        `/api/chat/${encodeURIComponent(runId)}/turns/${turnStart}/stream`,
    login: (redirect?: string, error?: "failed" | "credentials"): string => withQuery("/login", { redirect, error }),
    noAccess: (): string => "/no-access",
};

/**
 * 사이드바의 메뉴. 서버와 클라이언트가 함께 읽는 순수 데이터다.
 *
 * ⚠ 요소(`<Link>`)로 빚는 일은 클라이언트 모듈(`(app)/_components/navGroups.tsx`)이 한다. 아이콘은
 *    컴포넌트 참조라 서버에서 요소로 만들어 넘기면 직렬화되지 않는다.
 */
export const navigation = [
    { label: "대화", href: paths.chat(), match: "/chat", icon: MessageCircle },
] as const;

/**
 * 화면(iframe)에 서는 글. 한 파일에 모아 같은 것을 같은 말로 부르게 한다.
 *
 * 규칙은 `.claude/skills/ux-writing` 이 갖는다. 단추는 누르면 일어나는 일을 동사로 적고, 문장은 해요체로 맺는다.
 * 웹의 쪽지 화면과 같은 말을 쓴다. 목록의 제목은 「쪽지」이고 나만 보는 쪽지의 배지는 「비공개」다.
 *
 * ⚠ **「보관」은 쪽지를 치우는 일의 이름이다.** 목록을 「보관함」이라 부르면 보관한 쪽지가 모인 곳으로 읽힌다.
 * ⚠ 이 파일은 화면의 묶음에 들어간다. 아무것도 import 하지 않는다.
 */
export const COPY = {
    pages: { library: "쪽지", tray: "쪽지 서랍" },
    waiting: "불러오는 중이에요.",
    empty: "아직 쪽지가 없어요.",
    badges: { private: "비공개", archived: "보관됨", readOnly: "읽기 전용" },
    actions: {
        message: "지금 대화에 보내기",
        messageNew: "새 대화에 보내기",
        deselect: "닫기",
        fullscreen: "크게 보기",
        compose: "쪽지 쓰기",
        composing: "쓰는 중",
        save: "저장하기",
        reload: "다시 불러오기",
        import: "쪽지로 가져오기",
        reveal: "기본 뷰어로 열기",
    },
    labels: { title: "제목", body: "내용", visibility: "공개 범위", editor: "파일 내용" },
    file: {
        loading: "불러오는 중이에요.",
        saving: "저장하는 중이에요.",
        saved: "저장했어요.",
        unsaved: "저장하지 않은 글이 있어요.",
        conflict: "다른 곳에서 파일이 바뀌었어요. 다시 불러오면 지금 고친 글은 사라져요.",
        failed: "파일을 읽지 못했어요.",
        /** 한도를 모르면 첫 문장만 선다 */
        tooLarge: (limit: string | null): string =>
            (limit === null ? "파일이 너무 커서 저장하지 못했어요." : `파일이 너무 커서 저장하지 못했어요. ${limit}까지 저장할 수 있어요.`),
        saveFailed: "저장하지 못했어요. 잠시 뒤 다시 저장해 주세요.",
        imported: "쪽지로 가져왔어요.",
        importFailed: "쪽지로 가져오지 못했어요.",
        revealFailed: "파일을 열지 못했어요.",
    },
    errors: {
        load: "쪽지를 불러오지 못했어요. 창을 닫았다가 다시 열어 주세요.",
        message: "대화에 보내지 못했어요.",
        compose: "쪽지를 쓰지 못했어요. 잠시 뒤 다시 써 주세요.",
    },
    /** 대화로 보낼 때 쪽지 앞에 붙이는 말 */
    messageLead: (title: string): string => `「${title}」 쪽지를 같이 봐 주세요.`,
} as const;

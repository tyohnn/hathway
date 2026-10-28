/**
 * 저장소에 두는 글(블로그 · 문서 · 새 소식)의 모양.
 *
 * ⚠ **제목과 날짜는 목록 파일(`<모음>/index.ts`)이 갖고 본문만 MDX 가 갖는다.** 목록을 타입이 검사하고, 파일과 목록이
 *    어긋나지 않았는지를 `content.test.ts` 가 잰다. MDX 의 frontmatter 로 두면 목록을 만들려고 파일을 다 열어야 하고
 *    잘못 적은 날짜가 빌드를 지나 화면에서야 드러난다.
 * ⚠ **본문은 목록과 다른 파일(`<모음>/bodies.ts`)이 정적으로 불러온다.** 목록은 vitest 가 MDX 없이 읽어야 해서 본문을
 *    모르고, 본문은 동적 `import()` 로 두지 않는다. 동적으로 불러오는 모듈 안의 클라이언트 컴포넌트(복사 단추 등)는 개발
 *    서버의 프리페치 검증이 찾지 못해 「module factory is not available」로 깨진다(실측). 짝이 빠지면 `bodies.ts` 의
 *    타입(`Record<슬러그, …>`)이 막는다.
 */

export interface BlogPost
{
    readonly slug: string;
    readonly title: string;
    /** 목록에서 제목 아래 한 줄. 제목을 되풀이할 거면 두지 않는다 */
    readonly summary?: string;
    /** YYYY-MM-DD */
    readonly date: string;
    /** 글의 갈래(예: 소개 · 쓰는 법). 표지와 카드의 머리에 선다 */
    readonly category: string;
    /** 쓴 사람. 없으면 팀 이름(`BLOG_AUTHOR`)이 선다 */
    readonly author?: string;
    /** 목록 맨 위의 큰 표지에 세울 글. 여럿이면 최근 것 하나만 선다. 없으면 가장 최근 글이 선다 */
    readonly featured?: boolean;
    readonly cover: PostCover;
}

/**
 * 글의 표지. 그림 파일이 아니라 글로 그린다(`PostCover`). 첫 줄은 굵게, 나머지 줄은 가늘게 선다.
 * 바탕은 서식의 칸을 닮은 괘선이고 `pattern` 이 그 모양을, `tone` 이 종이(밝음)와 먹(어두움)을 고른다.
 */
export interface PostCover
{
    readonly lines: ReadonlyArray<string>;
    readonly tone: "paper" | "ink";
    readonly pattern: "rows" | "cells" | "columns";
}

export interface DocPage
{
    readonly slug: string;
    readonly title: string;
    /** 제목 아래 한 줄. 앞뒤 문서 카드와 첫 화면의 카드도 이 줄을 쓴다 */
    readonly description: string;
    /** 사이드바의 묶음 이름 */
    readonly group: string;
}

export interface Release
{
    /** 주소와 목록의 열쇠. 판 번호를 그대로 쓴다(예: 0.1.0) */
    readonly version: string;
    readonly title: string;
    /** YYYY-MM-DD */
    readonly date: string;
    /** 판의 머리에 서는 꼬리표(예: 웹 · MCP) */
    readonly tags?: ReadonlyArray<string>;
    /** 제목 아래에 크게 서는 그림. 없으면 제목 바로 아래에 본문이 선다 */
    readonly image?: ReleaseImage;
}

/**
 * 새 소식의 큰 그림. 파일은 `public/changelog/` 에 두고 주소는 `/changelog/<파일>` 로 적는다.
 * ⚠ 폭과 높이는 파일의 실제 픽셀이다. 그림이 뜨기 전에 자리를 잡아 두어 본문이 밀려 내려가지 않게 한다.
 */
export interface ReleaseImage
{
    readonly src: string;
    /** 그림이 보여 주는 것. 제목을 되풀이하지 않는다 */
    readonly alt: string;
    readonly width: number;
    readonly height: number;
}

import type React from "react";

export interface Crumb
{
    readonly label: string;
    /** 비우면 링크가 아니라 현재 위치로 그린다. 블록은 Next 를 모르므로 평범한 href 다 */
    readonly href?: string;
}

/**
 * 제목이 값(쪽지 제목 · 대화 제목)이면 그 값이 오기 전에는 `loading` 으로 세운다. 제목 자리만 막대이고 브레드크럼 ·
 * 설명 · 액션은 받은 그대로 선다. 제목이 고정된 글자(「쪽지」)인 화면은 `loading` 을 쓸 일이 없다.
 */
export type PageHeaderProps = PageHeaderBase & (
    | { readonly title: string; readonly loading?: false }
    | { readonly loading: true; readonly title?: undefined }
);

interface PageHeaderBase
{
    readonly description?: string;
    readonly breadcrumb?: ReadonlyArray<Crumb>;
    /** 오른쪽 끝에 붙는 버튼들. 호출부가 Button 을 그대로 넣는다 */
    readonly actions?: React.ReactNode;
    readonly className?: string;
}

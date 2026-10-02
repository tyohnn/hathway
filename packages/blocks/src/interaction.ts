/**
 * 안쪽 컨트롤을 누른 것을 바깥 누르기로 치지 않기 위한 판정.
 *
 * 행이나 항목 전체가 눌리는 블록에서, 그 안의 버튼·체크박스·링크를 누른 것은
 * 항목을 누른 것이 아니다. DataTable 의 셀과 ItemList 의 항목이 같은 술어를 쓴다 —
 * 두 벌로 갈리면 한쪽만 고쳐지는 순간 클릭의 뜻이 화면마다 달라진다.
 */
const INTERACTIVE_SELECTOR = "button, a, input, textarea, select, [role=checkbox], [role=menu], [role=menuitem], [data-slot=checkbox]";

export function isInteractiveTarget(target: EventTarget | null): boolean
{
    return target instanceof Element && target.closest(INTERACTIVE_SELECTOR) !== null;
}

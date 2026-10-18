import { Badge } from "@hathway/ui/components/badge";
import { Button } from "@hathway/ui/components/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@hathway/ui/components/card";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@hathway/ui/components/item";
import { Check } from "@hathway/ui/icons";

/**
 * 새 소식에 스크린숏 대신 세우는 화면 조각. tyohnn 의 changelog 템플릿처럼 실제 컴포넌트로 그린다.
 *
 * ⚠ **그림이다.** 누를 수 없게 `inert` 로 막고, 스크린리더에는 `figure` 의 이름 하나만 들린다. 글은 앱 화면의 글과
 *    같게 둔다(배지 「비공개」 · 「보관됨」, 동의 화면의 「연결할까요?」). 앱의 글을 고치면 여기도 고친다.
 */
// 앱의 목록과 같은 모양이다. 제목 아래는 내용의 첫 줄이고, 쓴 사람과 날짜는 목록에 나오지 않는다
const NOTES = [
    { title: "주간 회의 안건", preview: "배포 일정 정하기", badges: [] },
    { title: "배포 전 확인할 것", preview: "환경변수 다시 보기", badges: [{ label: "비공개", variant: "outline" }] },
    { title: "9월 고객 문의 정리", preview: "자주 묻는 것 셋", badges: [{ label: "보관됨", variant: "secondary" }] },
] as const;

export function NotesFragment()
{
    return (
        <figure aria-label="쪽지 목록 화면" className="not-typeset site-figure">
            <Card size="sm" inert>
                <CardHeader>
                    <CardTitle>쪽지</CardTitle>
                </CardHeader>
                <CardContent>
                    <ItemGroup className="gap-2">
                        {NOTES.map((note) => (
                            <Item key={note.title} variant="outline" size="sm">
                                <ItemContent>
                                    <ItemTitle>{note.title}</ItemTitle>
                                    <ItemDescription>{note.preview}</ItemDescription>
                                </ItemContent>
                                <ItemActions>
                                    {note.badges.map((badge) => <Badge key={badge.label} variant={badge.variant}>{badge.label}</Badge>)}
                                </ItemActions>
                            </Item>
                        ))}
                    </ItemGroup>
                </CardContent>
            </Card>
        </figure>
    );
}

export function ConnectFragment()
{
    return (
        <figure aria-label="Claude 연결 화면" className="not-typeset site-figure">
            <Card size="sm" inert className="max-w-sm">
                <CardHeader>
                    <CardTitle>Claude 연결할까요?</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="flex items-center gap-2 text-sm"><Check className="site-title-icon" />내 쪽지 읽고 쓰기</p>
                </CardContent>
                <CardFooter className="justify-end gap-2">
                    <Button variant="outline" size="sm">닫기</Button>
                    <Button size="sm">연결하기</Button>
                </CardFooter>
            </Card>
        </figure>
    );
}

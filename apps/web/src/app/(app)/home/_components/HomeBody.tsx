import Link from "next/link";

import { ItemList, type ListItem } from "@hathway/blocks/item-list";
import { PendingText } from "@hathway/blocks/pending";
import { Badge } from "@hathway/ui/components/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@hathway/ui/components/card";
import { Circle, CircleCheck } from "@hathway/ui/icons";

import { paths } from "@/lib/paths";
import type { ChecklistItem, HomePlan, HomeTodo } from "@/usecases/home";

/**
 * 홈의 두 칸. 왼쪽이 처리할 것, 오른쪽이 최근 쪽지(첫날에는 시작 점검표)다.
 *
 * ⚠ **기다리는 얼굴은 이 컴포넌트의 `plan={null}` 이다.** 두 카드의 틀과 제목 자리는 그대로이고 값 자리만 막대라서, 값이 와도 칸이 움직이지
 *    않는다. 처리할 것이 없어도 카드는 서고 「처리할 것이 없어요」라고 적는다. 칸이 있다 없다 하면 아래가 들썩인다.
 */
export function HomeBody({ plan }: { readonly plan: HomePlan | null })
{
    return (
        // 두 카드는 제 내용만큼 선다. 옆 칸의 높이에 맞춰 늘이면 처리할 것이 적은 날 빈 카드가 커 보인다
        <div className="grid items-start gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Card>
                <CardHeader>
                    <CardTitle>처리할 것</CardTitle>
                </CardHeader>
                <CardContent>
                    {plan === null ? <PendingText length={14} /> : <Todos todos={plan.todos} />}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>{plan === null ? <PendingText length={5} /> : plan.checklist === null ? "최근 쪽지" : "시작하기"}</CardTitle>
                    {plan?.recent === null || plan === null
                        ? null
                        : (
                            <CardAction>
                                <Link className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" href={paths.notes()} aria-label="쪽지 모두 보기">
                                    모두 보기
                                </Link>
                            </CardAction>
                        )}
                </CardHeader>
                <CardContent>
                    {plan === null
                        ? <ItemList items={[]} loading />
                        : plan.recent === null
                            ? <Checklist items={plan.checklist ?? []} />
                            : <ItemList items={plan.recent.map(recentItem)} appearance="divided" />}
                </CardContent>
            </Card>
        </div>
    );
}

const recentItem = (note: NonNullable<HomePlan["recent"]>[number]): ListItem => ({
    id: note.id,
    title: note.title,
    ...(note.body === "" ? {} : { description: note.body.split("\n")[0] }),
    actions: (
        <div className="flex items-center gap-2">
            {note.visibility === "private" ? <Badge variant="outline">비공개</Badge> : null}
            <Link className="text-sm underline-offset-4 hover:underline" href={paths.note(note.id)} aria-label={`${note.title} 열기`}>
                열기
            </Link>
        </div>
    ),
});

function Todos({ todos }: { readonly todos: ReadonlyArray<HomeTodo> })
{
    if (todos.length === 0)
    {
        return <p className="text-sm text-muted-foreground">처리할 것이 없어요</p>;
    }

    return (
        <ul className="flex flex-col gap-3">
            {todos.map((todo) => (
                <li key={todo.kind} className="flex items-center justify-between gap-3 text-sm">
                    <span>초대받고 아직 로그인하지 않은 사람 {todo.count}명</span>
                    <Link className="shrink-0 underline-offset-4 hover:underline" href={paths.team()}>팀에서 보기</Link>
                </li>
            ))}
        </ul>
    );
}

const CHECKLIST: Readonly<Record<ChecklistItem["kind"], { readonly label: string; readonly href: string }>> = {
    "first-note": { label: "첫 쪽지 쓰기", href: paths.newNote() },
    invite: { label: "멤버 초대하기", href: paths.team() },
    connect: { label: "Claude에 연결하기", href: paths.docs("connect-mcp") },
};

function Checklist({ items }: { readonly items: ReadonlyArray<ChecklistItem> })
{
    return (
        <ul aria-label="시작하기" className="flex flex-col gap-1">
            {items.map((item) =>
            {
                const { label, href } = CHECKLIST[item.kind];

                return (
                    <li key={item.kind}>
                        <Link
                            href={href}
                            className="flex h-10 items-center gap-3 rounded-md px-2 text-sm transition-colors hover:bg-muted [&_svg]:size-4"
                        >
                            {item.done === true
                                ? <CircleCheck aria-hidden className="text-[var(--chart-1)]" />
                                : <Circle aria-hidden className="text-muted-foreground" />}
                            <span className={item.done === true ? "text-muted-foreground line-through" : undefined}>{label}</span>
                            {item.done === true ? <span className="sr-only"> 완료</span> : null}
                            {item.done === null ? <Badge variant="outline" className="ml-auto">선택</Badge> : null}
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}

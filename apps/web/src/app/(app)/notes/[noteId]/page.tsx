import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Effect, Layer } from "effect";

import { PendingText } from "@hathway/blocks/pending";
import { type Property, PropertyList } from "@hathway/blocks/property-list";
import { Badge } from "@hathway/ui/components/badge";
import { DetailHeading } from "@hathway/ui/blocks/detail-heading";

import { extensionsLayer } from "@/lib/modules";
import { noteStoreLayer } from "@/lib/notesRuntime";
import { appRead } from "@/lib/read";
import { teamDirectoryLayer } from "@/lib/teamRuntime";
import { loadNoteDetail, type NoteDetail as Detail } from "@/usecases/noteDetail";

import { NoteMenu } from "../_components/NoteMenu";
import { SummarizeButton } from "../_components/SummarizeButton";

export const metadata: Metadata = { title: "쪽지" };

/**
 * 쪽지 하나(`/ia-design` 의 대시보드 해부도 5번). 머리(제목 · 상태 · ⋯ 메뉴) → 본문(왼쪽) · 속성 기둥(오른쪽)이다.
 *
 * ⚠ **볼 수 없는 쪽지는 404 다**(INV-NOTE-02). 「권한이 없습니다」를 그리면 그 번호의 쪽지가 있다는
 *    사실이 새어 나간다.
 * ⚠ **`params` 를 맨 위에서 기다리지 않는다.** 약속 그대로 `<Suspense>` 안쪽 조각에 넘긴다. 맨 위에서 기다리면 라우트가
 *    통째로 요청 시점이 되어 빌드가 막는다(`CLAUDE.md` 「정적 껍데기」).
 * ⚠ 기다리는 얼굴은 같은 `NoteView` 다. 제목 · 본문 · 속성 값 자리만 막대이고 틀은 같다.
 * ⚠ **탭과 활동은 두지 않았다.** 쪽지에는 나눌 만큼의 내용도, 바뀐 기록을 남기는 표도 없다. 협업 객체라면 활동(누가 언제 무엇을 바꿨나)을
 *    본문 아래나 탭에 두는데, 그때는 기록을 쌓는 표가 먼저다(스키마).
 */
export default function NotePage({ params }: { readonly params: Promise<{ readonly noteId: string }> })
{
    return (
        <Suspense fallback={<NoteView detail={null} />}>
            <NoteDetail params={params} />
        </Suspense>
    );
}

async function NoteDetail({ params }: { readonly params: Promise<{ readonly noteId: string }> })
{
    const { noteId } = await params;
    const detail = await appRead((actor) =>
        Effect.flatMap(
            Effect.all([noteStoreLayer, teamDirectoryLayer, extensionsLayer]),
            (layers) => loadNoteDetail(actor, noteId).pipe(Effect.provide(Layer.mergeAll(...layers))),
        ));

    if (detail === null)
    {
        notFound();
    }

    return <NoteView detail={detail} />;
}

const VISIBILITY = { tenant: "조직 전체", private: "나만" } as const;

/** 속성 기둥. 목록에서 보이던 속성과 같은 이름 · 같은 차례다. 공개 범위의 말은 쓰기 폼의 선택지와 같다 */
const properties = (detail: Detail | null): ReadonlyArray<Property> => [
    { label: "공개 범위", value: detail === null ? <PendingText length={5} /> : VISIBILITY[detail.note.visibility] },
    { label: "쓴 사람", value: detail === null ? <PendingText length={4} /> : detail.author },
    detail === null
        ? { label: "쓴 날", value: <PendingText length={10} /> }
        : { label: "쓴 날", value: detail.note.createdAt, kind: "date" },
];

function NoteView({ detail }: { readonly detail: Detail | null })
{
    const note = detail?.note;

    return (
        <div aria-busy={detail === null || undefined} className="flex flex-col gap-6">
            <DetailHeading
                loading={detail === null}
                title={note?.title}
                status={note?.status === "archived" ? <Badge variant="secondary">보관됨</Badge> : undefined}
                actions={detail === null ? undefined : <NoteMenu noteId={detail.note.id} version={detail.note.version} canArchive={detail.mine} />}
            />
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="flex min-w-0 flex-col gap-6">
                    {note === undefined
                        ? <p className="text-sm leading-6"><PendingText length={24} /></p>
                        : note.body === ""
                            ? null
                            : <p className="text-sm leading-6 whitespace-pre-wrap">{note.body}</p>}
                    {note?.status === "active" ? <SummarizeButton noteId={note.id} maxCredits={detail?.maxCredits ?? null} /> : null}
                </div>
                <aside aria-label="속성" className="lg:border-l lg:pl-6">
                    <PropertyList items={properties(detail)} orientation="horizontal" columns={1} />
                </aside>
            </div>
        </div>
    );
}

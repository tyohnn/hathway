import Link from "next/link";
import { Effect } from "effect";

import { EmptyState } from "@hathway/blocks/empty-state";
import { ItemList, type ListItem } from "@hathway/blocks/item-list";
import { PendingText } from "@hathway/blocks/pending";
import type { Note } from "@hathway/notes/domain/Note";
import { type Listing, type ListingParams, noteQueryFrom, planListing } from "@hathway/notes/rules/listing";
import { Badge } from "@hathway/ui/components/badge";
import { buttonVariants } from "@hathway/ui/components/button";

import { noteStoreLayer } from "@/lib/notesRuntime";
import { paths } from "@/lib/paths";
import { appRead } from "@/lib/read";
import { listNotePage } from "@/usecases/notes";

/**
 * 이 사람이 볼 수 있는 쪽지의 한 쪽(INV-NOTE-01). 볼 수 없는 것은 목록에서도 총수에서도 빠질 뿐 거절 문구가 서지 않는다
 * (INV-NOTE-02).
 *
 * ⚠ **주소를 이 조각에서 읽는다.** 페이지 맨 위에서 `searchParams` 를 기다리면 제목까지 요청 시점으로 밀린다. 약속 그대로 받아
 *    데이터를 읽는 이 조각 안에서 푼다(루트 `CLAUDE.md` 「정적 껍데기」 2번).
 * ⚠ **거르고 자르고 세는 일은 질의가 한다**(`listNotePage`). 다 읽어 여기서 자르지 않는다.
 */
export async function NoteList({ searchParams }: { readonly searchParams: Promise<ListingParams> })
{
    const query = noteQueryFrom(await searchParams);
    const page = await appRead((actor) => Effect.flatMap(noteStoreLayer, (layer) => listNotePage(actor, query).pipe(Effect.provide(layer))));

    return <NoteListView listing={planListing(query, page)} />;
}

/**
 * 목록 한 쪽의 얼굴. 기다리는 얼굴은 `listing={null}` 이다. 줄 자리와 발치의 범위 자리가 막대로 서고 틀은 그대로다.
 *
 * ⚠ **빈 상태는 셋이고 섞지 않는다**(`planListing`). 볼 수 있는 쪽지가 없는 사람에게는 「아직 없음」이 선다. 남의 쪽지가 있다는
 *    사실을 드러내지 않는다.
 */
export function NoteListView({ listing }: { readonly listing: Listing | null })
{
    if (listing === null)
    {
        return (
            <div className="flex flex-col gap-3">
                <ItemList items={[]} loading appearance="divided" />
                <p className="text-sm text-muted-foreground"><PendingText length={12} /></p>
            </div>
        );
    }

    if (listing.kind === "none-yet")
    {
        return (
            <EmptyState
                title="아직 쪽지가 없어요"
                action={<Link className={buttonVariants({})} href={paths.newNote()}>쪽지 쓰기</Link>}
            />
        );
    }

    if (listing.kind === "no-match")
    {
        return listing.reason === "filter"
            ? (
                <EmptyState
                    title="조건에 맞는 쪽지가 없어요"
                    action={<Link className={buttonVariants({ variant: "outline" })} href={paths.notes(listing.back)}>조건 지우기</Link>}
                />
            )
            : (
                <EmptyState
                    title="이 페이지에는 쪽지가 없어요"
                    action={<Link className={buttonVariants({ variant: "outline" })} href={paths.notes(listing.back)}>첫 페이지로</Link>}
                />
            );
    }

    return (
        <div className="flex flex-col gap-3">
            <ItemList items={listing.notes.map(noteItem)} appearance="divided" />
            <nav aria-label="페이지 넘기기" className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>{listing.total}개 중 {listing.from}–{listing.to}</span>
                <div className="flex gap-2">
                    {listing.previous === null
                        ? null
                        : <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={paths.notes(listing.previous)}>이전 페이지</Link>}
                    {listing.next === null
                        ? null
                        : <Link className={buttonVariants({ variant: "outline", size: "sm" })} href={paths.notes(listing.next)}>다음 페이지</Link>}
                </div>
            </nav>
        </div>
    );
}

const noteItem = (note: Note): ListItem => ({
    id: note.id,
    title: note.title,
    ...(note.body === "" ? {} : { description: note.body.split("\n")[0] }),
    actions: (
        <div className="flex items-center gap-2">
            {note.visibility === "private" ? <Badge variant="outline">비공개</Badge> : null}
            {note.status === "archived" ? <Badge variant="secondary">보관됨</Badge> : null}
            <Link className="text-sm underline-offset-4 hover:underline" href={paths.note(note.id)} aria-label={`${note.title} 열기`}>
                열기
            </Link>
        </div>
    ),
});

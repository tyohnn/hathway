import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@hathway/blocks/page-header";
import type { ListingParams } from "@hathway/notes/rules/listing";
import { buttonVariants } from "@hathway/ui/components/button";
import { Plus } from "@hathway/ui/icons";

import { paths } from "@/lib/paths";

import { NoteList, NoteListView } from "./_components/NoteList";
import { NoteSearch, NoteSearchFromParams } from "./_components/NoteSearch";

export const metadata: Metadata = { title: "쪽지" };

/**
 * 쪽지 목록. 예시 도메인이 서버 액션 · 행 단위 판정 · 블록을 한 화면에서 지나는 본보기이고, 실제 데이터 위의 목록 배관(질의에서 자르는
 * 쪽 넘기기 · 주소에 남는 찾기 · 빈 상태 셋 · 만들기 다이얼로그)의 본보기다. 목록의 겉모양(탭 · 칩 · 정렬)은 `/orders` 가 보인다.
 *
 * ⚠ **제목과 쓰기 단추는 `<Suspense>` 밖이다.** 누가 열어도 같아 빌드 때 구워 둔다. 주소를 읽는 찾는 칸과 목록은 저마다 제
 *    `<Suspense>` 안이고, `searchParams` 는 기다리지 않고 약속 그대로 넘긴다(`CLAUDE.md` 「정적 껍데기」).
 * ⚠ **쓰기 단추는 링크다.** 이 화면에서 누르면 `@modal/(.)new` 가 가로채 다이얼로그로 열고, 주소로 바로 오면 `new/page.tsx` 가 선다.
 */
export default function NotesPage({ searchParams }: { readonly searchParams: Promise<ListingParams> })
{
    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="쪽지"
                actions={
                    <Link className={buttonVariants({})} href={paths.newNote()}>
                        <Plus data-icon="inline-start" />
                        쪽지 쓰기
                    </Link>
                }
            />
            <Suspense fallback={<NoteSearch q={null} />}>
                <NoteSearchFromParams searchParams={searchParams} />
            </Suspense>
            <Suspense fallback={<NoteListView listing={null} />}>
                <NoteList searchParams={searchParams} />
            </Suspense>
        </div>
    );
}

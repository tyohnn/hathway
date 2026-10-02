import { Suspense } from "react";
import type { Metadata } from "next";
import { Effect } from "effect";

import { PageHeader } from "@investment/blocks/page-header";

import { paths } from "@/lib/paths";
import { appRead } from "@/lib/read";
import { teamDirectoryLayer } from "@/lib/teamRuntime";
import { myself } from "@/usecases/team";

import { RenameForm } from "./_components/RenameForm";

export const metadata: Metadata = { title: "내 계정" };

/**
 * 내 계정. 지금은 이름 하나를 고친다. 주소는 로그인한 계정의 것이라 여기서 바꾸지 않는다.
 *
 * ⚠ 기다리는 얼굴은 같은 폼이다(`RenameForm` 에 `account={null}`). 라벨과 단추는 같은 자리에 서고 값 칸만 꺼져 있다.
 */
export default function AccountPage()
{
    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="내 계정" />
            <Suspense fallback={<RenameForm account={null} />}>
                <Account />
            </Suspense>
        </div>
    );
}

async function Account()
{
    const me = await appRead((actor) => Effect.flatMap(teamDirectoryLayer, (layer) => myself(actor).pipe(Effect.provide(layer))), paths.account());

    return <RenameForm account={{ email: me?.email ?? "", name: me?.name ?? "" }} />;
}

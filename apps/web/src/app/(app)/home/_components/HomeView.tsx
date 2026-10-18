import { Effect, Layer } from "effect";

import { noteStoreLayer } from "@/lib/notesRuntime";
import { appRead } from "@/lib/read";
import { teamDirectoryLayer } from "@/lib/teamRuntime";
import { loadHome } from "@/usecases/home";

import { HomeBody } from "./HomeBody";

/** 홈의 두 칸을 읽는 조각. 사람마다 다르므로 요청 시점이고, 홈 화면이 이것만 `<Suspense>` 로 감싼다 */
export async function HomeView()
{
    const plan = await appRead((actor) =>
        Effect.flatMap(
            Effect.all([noteStoreLayer, teamDirectoryLayer]),
            ([notes, team]) => loadHome(actor).pipe(Effect.provide(Layer.mergeAll(notes, team))),
        ));

    return <HomeBody plan={plan} />;
}

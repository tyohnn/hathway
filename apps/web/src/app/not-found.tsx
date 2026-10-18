import Link from "next/link";

import { EmptyState } from "@hathway/blocks/empty-state";

import { paths } from "@/lib/paths";

/**
 * 없는 것과 볼 수 없는 것이 함께 오는 자리(INV-NOTE-02). 둘을 가르는 말을 적지 않는다.
 */
export default function NotFound()
{
    return (
        <EmptyState
            title="페이지를 찾을 수 없어요"
            action={<Link className="text-sm underline underline-offset-4" href={paths.home()}>처음으로 가기</Link>}
        />
    );
}

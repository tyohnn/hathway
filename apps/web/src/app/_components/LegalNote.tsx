import Link from "next/link";

import { paths } from "@/lib/paths";

/**
 * 문 앞 화면의 단추 아래에 두는 약관 안내. 그 단추를 누르는 일이 곧 약관에 동의하는 일이다(약관의 「이용 계약」).
 * 처리방침은 동의를 받는 글이 아니라 알리는 글이라 「확인한 것으로」 본다.
 * 로그인 화면이 「로그인하면」으로 쓰고, 앱 연결 화면(`/oauth/consent`)도 「연결하면」으로 같은 글을 쓸 수 있다.
 *
 * ⚠ 누가 열어도 같아서 `<Suspense>` 밖에 두고 틀과 함께 굽는다.
 */
export function LegalNote({ action }: { readonly action: string })
{
    return (
        <p className="mt-6 text-center text-xs text-muted-foreground">
            {action} <Link className="underline underline-offset-4" href={paths.terms()}>이용약관</Link>에 동의하고{" "}
            <Link className="underline underline-offset-4" href={paths.privacy()}>개인정보 처리방침</Link>을 확인한 것으로 봐요.
        </p>
    );
}

import Link from "next/link";

import { paths } from "@/lib/paths";

const LINKS = [
    { label: "문서", href: paths.docs() },
    { label: "블로그", href: paths.blog() },
    { label: "새 소식", href: paths.changelog() },
    { label: "이용약관", href: paths.terms() },
    // 처리방침 작성지침이 다른 고지와 구분해 보이라고 권한다
    { label: "개인정보 처리방침", href: paths.privacy(), strong: true },
    { label: "로그인", href: paths.login() },
] as const;

/**
 * 첫 화면과 블로그의 발치. 제품의 이름과 공개 화면으로 가는 길만 둔다.
 *
 * ⚠ 해(年)를 적지 않는다. 틀은 빌드 때 구워지므로 `new Date()` 를 부를 수 없고(루트 `CLAUDE.md` 「정적 껍데기」 5번), 손으로 적은
 *    해는 이듬해부터 틀린다.
 */
export function SiteFooter()
{
    return (
        <footer className="landing-footer">
            <div className="landing-footer-inner">
                <Link href={paths.landing()} className="font-semibold">Hathway 기업분석</Link>
                <nav aria-label="사이트 발치" className="landing-footer-nav">
                    {LINKS.map((link) => (
                        <Link key={link.href} href={link.href} className={"strong" in link ? "font-semibold" : undefined}>{link.label}</Link>
                    ))}
                </nav>
            </div>
        </footer>
    );
}

export interface SectionPlaceholderProps
{
    readonly title: string;
    /** 무엇이 이 자리에 서는지와 어느 묶음이 만드는지 */
    readonly body: string;
}

/**
 * 아직 화면이 붙지 않은 라우트가 쓰는 한 장.
 *
 * ⚠ **빈 화면을 두지 않는다.** 셸과 내비게이션이 먼저 서는 묶음에서는 라우트 여럿이 함께 생기는데,
 *    눌렀을 때 아무것도 없으면 고장과 구분되지 않는다. 무엇이 이 자리에 서는지와 어느 묶음이 만드는지를 적는다.
 * ⚠ 가짜 데이터를 그리지 않는다. 목록처럼 보이는 자리를 만들어 두면 그것이 진짜인지 자리인지 알 수 없다.
 * ⚠ **앱마다 복사하지 않는다.** 2026-09-16 에 admin 과 agent 가 바이트까지 같은 사본을 들고 있는 것을
 *    발견해 여기로 올렸다.
 */
export function SectionPlaceholder({ title, body }: SectionPlaceholderProps)
{
    return (
        <section className="flex max-w-xl flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground text-sm leading-5">{body}</p>
        </section>
    );
}

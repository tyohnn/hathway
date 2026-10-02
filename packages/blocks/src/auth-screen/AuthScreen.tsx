import type { AuthScreenProps } from "./types";

/**
 * 로그인과 「허용되지 않은 계정」이 함께 쓰는 틀.
 *
 * 왼쪽은 말이 오는 자리이고 오른쪽은 이 앱이 무엇을 하는 곳인지 한 장으로 보이는 자리다. 두 화면이 같은
 * 틀을 쓰는 이유는 둘이 같은 여정의 앞뒤이기 때문이다 — 들어오려다 막힌 사람이 다른 세계로 떨어지지 않는다.
 *
 * ⚠ **셸(사이드바·상단 바)이 없는 자리다.** 로그인하지 않은 사람에게 내비게이션을 보이면 갈 수 없는 곳의
 *    이름을 먼저 읽게 된다.
 * ⚠ **오른쪽 판은 앱이 넘긴다.** 그림이 앱마다 다르고, 값이 진짜처럼 보이지 않게 하는 책임도 앱에 있다 —
 *    로그인 화면은 아무나 보는 자리이므로 고객사 이름이나 금액을 닮은 문장을 두지 않는다.
 */
export function AuthScreen({ brand, description, showcase, children }: AuthScreenProps)
{
    return (
        <main className="bg-canvas flex min-h-dvh items-center justify-center px-6 py-12">
            <div className="flex w-full max-w-[1120px] flex-col items-center gap-12 lg:flex-row lg:gap-20">
                <div className="flex w-full max-w-[480px] flex-col">
                    <h1 className="text-4xl leading-tight tracking-tight">
                        <strong className="font-bold">{brand.strong}</strong>{" "}
                        <span className="font-normal">{brand.rest}</span>
                    </h1>
                    {description === undefined ? null : <p className="text-muted-foreground mt-5 text-sm leading-6">{description}</p>}

                    {children}
                </div>

                {showcase === undefined ? null : showcase}
            </div>
        </main>
    );
}

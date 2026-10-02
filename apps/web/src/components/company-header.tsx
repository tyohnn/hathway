import { classifySector, type Company } from "@investment/schema";
import { Badge } from "@investment/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@investment/ui/components/card";
import { Separator } from "@investment/ui/components/separator";

function formatKoDate(date: string | null | undefined): string
{
    if (!date) return "—";
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return date;
    return `${m[1]}.${m[2]}.${m[3]}`;
}

function Slot({ label, value }: { label: string; value: string })
{
    const empty = value === "—";
    return (
        <div>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className={empty ? "text-muted-foreground" : "font-medium"}>{value}</dd>
        </div>
    );
}

/**
 * 종목 화면의 머리. 겉은 시스템의 `Card` 이고 여백과 모서리와 면은 그것이 정한다.
 *
 * ⚠ **지표 줄은 블록(`PropertyList`)으로 바꾸지 않았다.** 그 블록은 한 줄에 둘까지 세운다. 여기는 다섯을 한 줄에
 *    나란히 세워 한눈에 견주는 띠라 줄 수가 늘면 머리가 본문을 밀어낸다.
 */
export function CompanyHeader({ company }: { company: Company })
{
    const fiscal = company.fiscal_month ? `${company.fiscal_month}월 결산` : "—";
    const sector = classifySector(company.sector_code, company.stock_code)?.industryName ?? "업종 미상";

    return (
        <Card size="sm">
            <CardHeader>
                <CardTitle className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{company.name}</h1>
                    <span className="font-mono text-sm font-normal text-muted-foreground">
                        {company.stock_code ?? "—"} · {fiscal}
                    </span>
                </CardTitle>
                <CardDescription className="flex flex-col gap-1">
                    <span className="text-xs">홈페이지 — · 전화번호 — · 주소 —</span>
                    <span className="flex flex-wrap items-center gap-1.5">
                        {company.market && <Badge variant="secondary">{company.market}</Badge>}
                        <Badge variant="outline">{sector}</Badge>
                        <Badge variant="outline">WI26 —</Badge>
                        <Badge variant="outline">K200 —</Badge>
                        <Badge variant="outline">NXT —</Badge>
                    </span>
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <Separator />
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-5">
                    <Slot label="PER" value="—" />
                    <Slot label="PER(Fwd.12M)" value="—" />
                    <Slot label="업종 PER" value="—" />
                    <Slot label="PBR" value="—" />
                    <Slot label="현금배당수익률" value="—" />
                </dl>
                <Separator />
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                    <Slot label="대표이사" value={company.ceo ?? "—"} />
                    <Slot label="결산월" value={company.fiscal_month ? `${company.fiscal_month}월` : "—"} />
                    <Slot label="설립일" value={formatKoDate(company.established)} />
                </dl>
            </CardContent>
        </Card>
    );
}

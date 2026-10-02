/**
 * 이 페이지 전용 표시 헬퍼.
 * `@investment/schema` 의 포매터는 사실 시계열(fact_date/precision)·payload 단위 변환을
 * 담당하고, 여기는 순수 ISO 날짜 문자열(공시일·정정일 등)을 한국어로 보여주는 것만 한다.
 */
export function formatKoDate(date: string | null | undefined): string
{
    if (!date) return "—";
    const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return date;
    return `${m[1]}.${m[2]}.${m[3]}`;
}

export function dartUrl(rceptNo: string): string
{
    return `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${rceptNo}`;
}

/** DART 공시 목록의 비고(`rm`). 한 글자 부호라 그대로 두면 읽을 수 없다 */
const FILING_REMARKS: Readonly<Record<string, string>> = {
    유: "유가증권시장",
    코: "코스닥시장",
    넥: "코넥스시장",
    채: "채권상장법인",
    공: "공정위",
    연: "연결 포함",
    정: "이후 정정",
    철: "철회",
};

/** 부호가 여럿이면 차례로 풀어 잇는다. 모르는 부호는 그대로 둔다 */
export function filingRemark(rm: string | null | undefined): string
{
    return [...(rm ?? "").trim()].map((mark) => FILING_REMARKS[mark] ?? mark).join(" · ");
}

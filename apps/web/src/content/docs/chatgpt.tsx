import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hathway/ui/components/table";

import { SITE_URL } from "@/lib/site";

import { Callout, CodeBlock, H2, Step, Steps } from "@/app/(site)/_components/prose";

/**
 * ChatGPT 에서 쓰는 문서. 연결 주소가 들어가서 MDX 가 아니라 TSX 로 둔다(`SITE_URL`).
 *
 * ⚠ **도구 목록은 손으로 적었다.** 플러그인 도구는 `modules/plugin` 에서 아직 다시 짜는 중이라 코드에서 그리지 않고,
 *    정본인 흐름표(`plugin-ux/흐름표.md` 2절)의 도구 지도를 사람의 말로 옮겼다. 화면만 부르는 도구(`browse_company`)와
 *    호스트가 부르는 도구(`search_mentions`)는 사람이 직접 고를 일이 없어 뺐다. 도구가 서면 「MCP 도구」 문서처럼 코드에서 그린다.
 */
interface Tool
{
    readonly name: string;
    readonly ask: string;
    readonly shows: string;
}

const ANALYSIS: ReadonlyArray<Tool> = [
    { name: "find_company", ask: "「크래프톤 찾아 줘」", shows: "이름이나 종목 코드로 기업을 찾아요. 여럿이 걸리면 ChatGPT가 물어봐요." },
    { name: "show_company", ask: "「크래프톤 요약해 줘」", shows: "업종, 최근 12개월 실적과 5년 추이를 카드로 보여 줘요." },
    { name: "show_financials", ask: "「분기 매출 추이 보여 줘」", shows: "연간 · 분기 추이를 표와 막대로 보여 줘요. 계정은 셋까지 골라요." },
    { name: "compare_peers", ask: "「같은 업종이랑 비교해 줘」", shows: "같은 업종 기업 넷에서 여섯과 매출 성장 · 영업이익률 · ROE를 견줘요. 고른 기업의 줄이 굵게 보여요." },
    { name: "value_company", ask: "「3년 뒤 매출 2조, 순이익률 15%로 적정가 계산해 줘」", shows: "적은 가정(3년 뒤 매출 · 순이익률 · PER 세 시나리오)으로 적정가와 매수가를 계산해요." },
    { name: "list_filings", ask: "「최근 공시 보여 줘」", shows: "최근 공시와 주요사항, 지분 변동을 시간순으로 보여 줘요. 원문은 DART에서 열어요." },
    { name: "screen_stocks", ask: "「매출이 5년 동안 늘고 이익률 10% 넘는 게임사 찾아 줘」", shows: "업종과 성장률, 이익률 조건에 맞는 후보를 표로 보여 줘요." },
];

const BOARDS: ReadonlyArray<Tool> = [
    { name: "open_home", ask: "사이드바에서 Hathway 기업분석 열기", shows: "내 리서치 보드와 최근 본 종목을 보여 줘요." },
    { name: "open_boards", ask: "대화 옆 패널에서 보드 열기", shows: "리서치 보드를 고르고 대화에 붙여요." },
    { name: "save_to_board", ask: "「이 분석 보드에 담아 줘」", shows: "지금 본 숫자와 요약을 보드의 칸으로 담아요." },
];

function ToolTable({ tools }: { readonly tools: ReadonlyArray<Tool> })
{
    return (
        <Table className="not-typeset site-block">
            <TableHeader>
                <TableRow>
                    <TableHead>이렇게 말하면</TableHead>
                    <TableHead>보이는 것</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {tools.map((tool) => (
                    <TableRow key={tool.name}>
                        <TableCell className="whitespace-normal">{tool.ask}</TableCell>
                        <TableCell className="whitespace-normal">{tool.shows}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export default function ChatGpt()
{
    const endpoint = `${SITE_URL}/api/mcp`;

    return (
        <>
            <Callout title="투자 자문이 아니에요">
                계산은 내가 넣은 가정으로 낸 연습의 결과예요. 중요한 숫자는 DART 원문으로 확인해 주세요.
            </Callout>

            <H2>연결하기</H2>
            <Steps>
                <Step title="앱 찾기">ChatGPT의 <strong>설정</strong>에서 <strong>앱</strong>을 열고 <strong>Hathway 기업분석</strong>을 찾아요.</Step>
                <Step title="연결 누르기">브라우저가 열리면 Google 계정으로 로그인해요.</Step>
                <Step title="연결하기 누르기">ChatGPT가 내 계정으로 종목을 읽고 보드에 담을 수 있게 돼요.</Step>
            </Steps>
            <p>개발자 모드에서 직접 연결할 때는 아래 주소를 넣어요.</p>
            <CodeBlock title="주소" code={endpoint} />

            <H2>종목 분석</H2>
            <p>대화에서 기업 이름을 말하면 ChatGPT가 알맞은 도구를 골라 불러요. 도구 이름을 외울 필요는 없어요.</p>
            <ToolTable tools={ANALYSIS} />

            <H2>리서치 보드</H2>
            <ToolTable tools={BOARDS} />
            <Callout tone="lock" title="리서치 보드는 로그인하지 않은 사람에게도 보여요">
                고치고 지우는 것은 같은 조직의 멤버만 할 수 있어요. 공개하면 안 되는 내용은 담지 말아 주세요.
            </Callout>

            <H2>연결 끊기</H2>
            <p>ChatGPT의 <strong>설정</strong> › <strong>앱</strong>에서 Hathway 기업분석을 골라 연결을 끊어요.</p>
        </>
    );
}

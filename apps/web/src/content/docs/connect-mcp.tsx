import { SITE_URL } from "@/lib/site";

import { Callout, CodeBlock, H2, Step, Steps } from "@/app/(site)/_components/prose";

/**
 * Claude에 연결하는 문서. 명령에 이 서비스의 실제 주소가 들어가야 해서 MDX 가 아니라 TSX 로 둔다(`SITE_URL`).
 */
export default function ConnectMcp()
{
    const endpoint = `${SITE_URL}/api/mcp`;

    return (
        <>
            <Callout tone="lock" title="Claude도 내 계정의 권한으로만 보드와 쪽지를 고쳐요" />

            <H2>Claude 앱</H2>
            <Steps>
                <Step title="커스텀 커넥터 추가하기"><strong>설정</strong>에서 <strong>커넥터</strong>를 열고 <strong>커스텀 커넥터 추가</strong>를 눌러요.</Step>
                <Step title="주소 넣기">
                    <p>아래 주소를 붙여 넣어요.</p>
                    <CodeBlock title="주소" code={endpoint} />
                </Step>
                <Step title="로그인하고 연결하기"><strong>연결</strong>을 누르면 브라우저가 열려요. 로그인하고 <strong>연결하기</strong>를 눌러요.</Step>
            </Steps>

            <H2>Claude Code</H2>
            <Steps>
                <Step title="Hathway 기업분석 추가하기">
                    <p>터미널에서 아래 명령을 실행해요.</p>
                    <CodeBlock code={`claude mcp add --transport http hathway ${endpoint}`} />
                </Step>
                <Step title="로그인하고 연결하기">Claude Code에서 <code>/mcp</code>를 열고 <strong>hathway</strong>를 골라 <strong>Authenticate</strong>를 눌러요. 브라우저가 열리면 로그인하고 <strong>연결하기</strong>를 눌러요.</Step>
            </Steps>

            <H2>연결 끊기</H2>
            <p>Claude 앱에서는 커넥터 목록에서 지워요. Claude Code에서는 아래 명령을 실행해요.</p>
            <CodeBlock code="claude mcp remove hathway" />
        </>
    );
}

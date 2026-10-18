import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hathway/ui/components/table";

import { TOOLS } from "@/lib/mcp";

import { CodeBlock, H2, RequiredBadge } from "@/app/(site)/_components/prose";

/**
 * MCP 도구 문서. **코드의 도구 목록(`lib/mcp.ts` 의 `TOOLS`)에서 그린다.** 손으로 적으면 도구를 더하는 날 문서가 뒤처진다.
 * 도구마다 tyohnn 의 api-reference 템플릿처럼 이름 · 설명 · 받는 값의 표 · 부르는 예를 세운다.
 *
 * ⚠ 도구 설명은 모델이 읽도록 쓴 글이라 여기서는 사람의 말로 다시 적은 표(`HUMAN`)를 먼저 쓴다. 표에 없는 도구와 값은
 *    모델용 설명을 그대로 보인다. 도구를 더하면 이 표에도 한 줄을 더한다.
 */
interface Human
{
    readonly summary: string;
    readonly fields?: Readonly<Record<string, string>>;
    readonly example: Readonly<Record<string, unknown>>;
}

const HUMAN: Readonly<Record<string, Human>> = {
    list_notes: {
        summary: "내가 볼 수 있는 쪽지의 제목을 읽어요. 보관한 쪽지는 빠져요.",
        example: {},
    },
    create_note: {
        summary: "새 쪽지를 써요. 공개 범위를 따로 말하지 않으면 조직 전체에 보여요.",
        fields: {
            title: "쪽지 제목",
            body: "쪽지 내용",
            visibility: "private면 나만, tenant면 조직 전체",
        },
        example: { title: "주간 회의 안건", body: "배포 일정 정하기", visibility: "tenant" },
    },
};

interface Property
{
    readonly type?: string;
    readonly enum?: ReadonlyArray<string>;
}

const typeOf = (property: Property): string =>
    property.enum === undefined ? property.type ?? "" : property.enum.map((value) => `"${value}"`).join(" | ");

export default function McpTools()
{
    return (
        <>
            {TOOLS.map((tool) =>
            {
                const human = HUMAN[tool.name];
                const properties: ReadonlyArray<[string, Property]> = Object.entries(tool.inputSchema.properties);
                const required: ReadonlyArray<string> = "required" in tool.inputSchema ? tool.inputSchema.required : [];
                const call = JSON.stringify({ name: tool.name, arguments: human?.example ?? {} }, null, 2);

                return (
                    <section key={tool.name}>
                        <H2 id={tool.name}><code>{tool.name}</code></H2>
                        <p>{human?.summary ?? tool.description}</p>
                        {properties.length === 0 ? <p>받는 값이 없어요.</p> : (
                            <div className="site-table not-typeset">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>이름</TableHead>
                                            <TableHead>형식</TableHead>
                                            <TableHead>필수</TableHead>
                                            <TableHead>설명</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {properties.map(([name, property]) => (
                                            <TableRow key={name}>
                                                <TableCell><code className="site-inline-code">{name}</code></TableCell>
                                                <TableCell className="site-wrap"><code className="site-inline-code">{typeOf(property)}</code></TableCell>
                                                <TableCell><RequiredBadge required={required.includes(name)} /></TableCell>
                                                <TableCell className="site-wrap">{human?.fields?.[name] ?? ""}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                        <CodeBlock title="부르는 예" code={call} />
                    </section>
                );
            })}
        </>
    );
}

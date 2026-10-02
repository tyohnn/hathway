import { cellText } from "./columns";
import type { ColumnSpec, DataRow } from "./types";

export type Delimiter = "," | "\t";

export interface DelimitedOptions
{
    /** 클립보드는 탭(스프레드시트에 붙는다), 내보내기는 쉼표 */
    readonly delimiter?: Delimiter;
    readonly header?: boolean;
}

/** 구분자·따옴표·줄바꿈이 든 값은 따옴표로 감싸고 안의 따옴표는 두 번 적는다(RFC 4180) */
export function quoteField(field: string, delimiter: Delimiter): string
{
    if (field.includes(delimiter) || field.includes("\"") || field.includes("\n") || field.includes("\r"))
    {
        return `"${field.replace(/"/g, "\"\"")}"`;
    }

    return field;
}

/** 이미 형식이 잡힌 셀 행렬을 잇는다. 범위 복사가 쓴다 */
export function cellsToDelimited(matrix: ReadonlyArray<ReadonlyArray<string>>, delimiter: Delimiter): string
{
    return matrix.map((line) => line.map((field) => quoteField(field, delimiter)).join(delimiter)).join("\n");
}

/** 행과 열 명세로 구분자 텍스트를 만든다. 값의 형식은 화면과 같다(`cellText`) */
export function toDelimited<Row extends DataRow>(
    rows: ReadonlyArray<Row>,
    columns: ReadonlyArray<ColumnSpec<Row>>,
    options: DelimitedOptions = {},
): string
{
    const delimiter = options.delimiter ?? "\t";
    const lines: string[][] = [];

    if (options.header ?? true)
    {
        lines.push(columns.map((column) => column.label));
    }

    for (const row of rows)
    {
        lines.push(columns.map((column) => cellText(column, row)));
    }

    return cellsToDelimited(lines, delimiter);
}

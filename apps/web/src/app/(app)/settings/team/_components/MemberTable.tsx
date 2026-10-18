"use client";

import { useMemo, useState, useTransition } from "react";

import type { MembershipRole } from "@hathway/access/domain/AppAudience";
import { PendingText } from "@hathway/blocks/pending";
import { Badge } from "@hathway/ui/components/badge";
import { Button } from "@hathway/ui/components/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@hathway/ui/components/input-group";
import { NativeSelect, NativeSelectOption } from "@hathway/ui/components/native-select";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@hathway/ui/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@hathway/ui/components/table";
import { Search } from "@hathway/ui/icons";

import { changeRoleAction, removeMemberAction } from "@/actions/team";

import { PanelCard } from "../../_components/PanelCard";
import { PersonCell } from "../../_components/Person";
import { ROLE_LABELS } from "../../_components/roles";

import { filterMembers, type MemberLine, type RoleFilter } from "./roster";

/** 기다리는 얼굴의 줄 수. 작은 팀의 크기라 값이 와도 표가 크게 움직이지 않는다 */
const PENDING_ROWS = 3;

const HEADING_ID = "team-members";

const ROLE_FILTERS: ReadonlyArray<{ readonly value: RoleFilter; readonly label: string }> = [
    { value: "all", label: "모든 역할" },
    { value: "owner", label: ROLE_LABELS.owner },
    { value: "admin", label: ROLE_LABELS.admin },
    { value: "member", label: ROLE_LABELS.member },
];

interface MemberTableProps
{
    readonly lines?: ReadonlyArray<MemberLine>;
    /** 관리할 수 있는 사람인가. 그때만 줄 끝에 단추 열이 선다 */
    readonly canManage?: boolean;
    readonly loading?: boolean;
}

/**
 * 멤버 표. 검색과 역할 조건이 이 안에서 돈다(받은 줄을 거를 뿐 다시 읽지 않는다).
 *
 * ⚠ **판정이 어차피 거절할 줄에는 고치는 칸과 단추가 없다.** 소유자 줄, 내 줄, 관리자가 보는 다른 관리자 줄이다.
 *    눌러 본 뒤에야 안 되는 것을 알게 하지 않는다. 세울지는 서버 조각이 판정에 물어 줄마다 싣는다(`MemberLine.editable`).
 * ⚠ **멤버 배지는 달지 않는다.** 기본 역할을 모든 줄에 배지로 달면 같은 소음이 선다. 소유자와 관리자만 배지이고 멤버는
 *    흐린 글자다. 표의 역할 칸을 비워 두면 값이 빠진 것으로 읽혀서 글자는 적는다.
 * ⚠ **초대만 받고 아직 로그인하지 않은 사람에게는 「초대됨」을 단다.** 이름이 없어 이메일만 서므로 들어온 사람과 가를 수 없다.
 * ⚠ **역할 조건의 이름은 「역할」로 끝나지 않는다.** 줄마다 서는 역할 칸의 이름이 「{이름} 역할」이라, 조건까지 그렇게 끝나면
 *    스크린리더로 듣는 사람이 고치는 칸과 거르는 칸을 가르지 못한다.
 * ⚠ 첫 열의 머리는 「이름」이다. 바로 위 카드의 제목이 「멤버」라 같은 말을 두 줄 연달아 세우지 않는다.
 * ⚠ `loading` 은 같은 틀에서 줄 자리만 막대로 바꾼다. 검색과 조건은 같은 모양으로 꺼져 있다.
 */
export function MemberTable({ lines = [], canManage = false, loading = false }: MemberTableProps)
{
    const [query, setQuery] = useState("");
    const [role, setRole] = useState<RoleFilter>("all");
    const shown = useMemo(() => filterMembers(lines, { query, role }), [lines, query, role]);
    const columns = canManage ? 3 : 2;

    const clear = (): void =>
    {
        setQuery("");
        setRole("all");
    };

    return (
        <PanelCard
            title="멤버"
            headingId={HEADING_ID}
            count={loading ? <PendingText length={2} /> : `${lines.length}명`}
            busy={loading}
            flush
            action={(
                <>
                    <InputGroup className="w-56">
                        <InputGroupAddon><Search /></InputGroupAddon>
                        <InputGroupInput
                            type="search"
                            aria-label="멤버 검색"
                            placeholder="이름 · 이메일"
                            value={query}
                            disabled={loading}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                    </InputGroup>
                    <Select
                        items={ROLE_FILTERS}
                        value={role}
                        disabled={loading}
                        onValueChange={(next) =>
                        {
                            // 프리미티브는 값을 아무 꼴로나 준다. 아는 조건 가운데 있는 것만 받는다
                            const picked = ROLE_FILTERS.find((item) => item.value === next);

                            if (picked !== undefined)
                            {
                                setRole(picked.value);
                            }
                        }}
                    >
                        <SelectTrigger size="sm" aria-label="역할 조건" className="min-w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectGroup>
                                {ROLE_FILTERS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                            </SelectGroup>
                        </SelectContent>
                    </Select>
                </>
            )}
        >
            <Table aria-labelledby={HEADING_ID}>
                <TableHeader>
                    <TableRow>
                        <TableHead>이름</TableHead>
                        <TableHead>역할</TableHead>
                        {canManage ? <TableHead><span className="sr-only">관리</span></TableHead> : null}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading
                        ? Array.from({ length: PENDING_ROWS }, (_, index) => <PendingRow key={index} />)
                        : shown.length === 0
                            ? (
                                <TableRow>
                                    <TableCell colSpan={columns} className="py-8 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="st-meta">조건에 맞는 멤버가 없어요</span>
                                            <Button variant="outline" size="sm" onClick={clear}>조건 지우기</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                            : shown.map((line) => <MemberRow key={line.membershipId} line={line} canManage={canManage} columns={columns} />)}
                </TableBody>
            </Table>
        </PanelCard>
    );
}

interface MemberRowProps
{
    readonly line: MemberLine;
    readonly canManage: boolean;
    readonly columns: number;
}

/**
 * 한 사람의 줄. 고칠 수 있는 줄에는 역할을 고르는 칸과 팀에서 빼는 단추가 선다.
 *
 * ⚠ **바꾸기 전 역할(`role`)을 함께 보낸다.** 그사이 다른 사람이 바꿨으면 덮어쓰지 않고 새로고침을 권한다.
 * ⚠ **「내보내기」라 하지 않는다.** 설정 화면에서는 파일 내보내기로 읽힌다.
 * ⚠ **팀에서 빼기에 확인 창이 없다.** 다시 초대하면 같은 멤버십이 되살아나 되돌릴 수 있는 일이다(`ux-writing`
 *    「자리별 규칙」: 되돌릴 수 없는 일만 확인 창을 띄운다).
 * ⚠ 거절된 까닭은 그 줄 바로 아래에 한 줄로 선다. 칸 안에 넣으면 긴 글이 표의 열 너비를 민다.
 */
function MemberRow({ line, canManage, columns }: MemberRowProps)
{
    const [pending, start] = useTransition();
    const [message, setMessage] = useState<string | null>(null);
    const who = line.name ?? line.email;

    const change = (to: string): void =>
    {
        start(async () =>
        {
            const result = await changeRoleAction({ membershipId: line.membershipId, from: line.role, to: to === "admin" ? "admin" : "member" });

            setMessage(result.ok ? null : result.message);
        });
    };

    const remove = (): void =>
    {
        start(async () =>
        {
            const result = await removeMemberAction({ membershipId: line.membershipId });

            setMessage(result.ok ? null : result.message);
        });
    };

    return (
        <>
            <TableRow>
                <TableCell>
                    <PersonCell
                        name={line.me ? `${who} (나)` : who}
                        initialFrom={who}
                        toneKey={line.email}
                        {...(line.name === null ? {} : { meta: line.email })}
                        badges={line.pending ? <Badge variant="secondary">초대됨</Badge> : undefined}
                    />
                </TableCell>
                <TableCell>
                    {line.editable
                        ? (
                            <NativeSelect
                                aria-label={`${who} 역할`}
                                size="sm"
                                value={line.role}
                                disabled={pending}
                                onChange={(event) => change(event.target.value)}
                            >
                                <NativeSelectOption value="member">{ROLE_LABELS.member}</NativeSelectOption>
                                <NativeSelectOption value="admin">{ROLE_LABELS.admin}</NativeSelectOption>
                            </NativeSelect>
                        )
                        : <RoleMark role={line.role} />}
                </TableCell>
                {canManage
                    ? (
                        <TableCell className="text-right">
                            {line.editable
                                ? (
                                    <Button variant="ghost" size="sm" disabled={pending} onClick={remove} aria-label={`${who} 팀에서 빼기`}>
                                        팀에서 빼기
                                    </Button>
                                )
                                : null}
                        </TableCell>
                    )
                    : null}
            </TableRow>
            {message === null
                ? null
                : (
                    <TableRow>
                        <TableCell colSpan={columns} className="whitespace-normal">
                            <span role="alert" className="text-destructive text-sm">{message}</span>
                        </TableCell>
                    </TableRow>
                )}
        </>
    );
}

/** 고칠 수 없는 줄의 역할. 소유자와 관리자는 배지이고 멤버는 흐린 글자다 */
function RoleMark({ role }: { readonly role: MembershipRole })
{
    return role === "member"
        ? <span className="text-muted-foreground">{ROLE_LABELS.member}</span>
        : <Badge variant="outline">{ROLE_LABELS[role]}</Badge>;
}

function PendingRow()
{
    return (
        <TableRow>
            <TableCell><PersonCell loading /></TableCell>
            <TableCell><PendingText length={3} /></TableCell>
        </TableRow>
    );
}

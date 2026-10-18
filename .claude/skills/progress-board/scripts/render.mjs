#!/usr/bin/env node
/**
 * 스레드의 진행 상태 파일을 받아 스레드에 붙일 SVG 를 그린다. `progress-board` 스킬의 그리는 쪽이다.
 *
 *   node .claude/skills/progress-board/scripts/render.mjs <상태.json>             한 스레드
 *   node .claude/skills/progress-board/scripts/render.mjs <상태.json> <상태.json>…  여러 스레드를 한 장에
 *   node .claude/skills/progress-board/scripts/render.mjs --summary <상태.json>    체크리스트 머리에 넣을 한 줄
 *
 * 파일 모양은 SKILL.md 의 「상태 파일」 절이 정본이다. 여기서는 그 모양을 지키는지 재고, 어긋나면 그리지 않고
 * 무엇이 틀렸는지 찍고 끝낸다. 틀린 그림을 내보내는 것보다 그리지 않는 편이 낫다.
 *
 * ⚠ 색은 hex 로 적지 않는다. 스레드 위젯이 밝은 화면과 어두운 화면을 따라가도록 `c-green` 같은 클래스와
 *    글자 클래스(`t` · `ts` · `th`)만 쓴다. 위젯이 그 클래스에 색을 입힌다.
 */
import { readFileSync } from "node:fs";

/** 단계는 루트 CLAUDE.md 「개발 과정」의 순서를 그대로 따른다. 순서를 바꾸면 그 절과 함께 바꾼다 */
export const STAGES = [
    { key: "issue", label: "이슈" },
    { key: "spec", label: "테스트 이름" },
    { key: "redGreen", label: "빨강→초록" },
    { key: "local", label: "로컬 테스트" },
    { key: "review", label: "규약 점검" },
    { key: "pr", label: "PR" },
    { key: "merge", label: "머지" },
];

const STAGE_STATES = new Set(["done", "doing", "blocked", "todo", "na"]);
const CHECK_STATES = new Set(["pass", "fail", "foreign", "running", "skipped", "todo", "na"]);

const STAGE_CLASS = { done: "c-green", doing: "c-blue", blocked: "c-red", todo: "c-gray", na: "c-gray" };
const CHECK_CLASS = { pass: "c-green", fail: "c-red", foreign: "c-amber", running: "c-blue", skipped: "c-amber", todo: "c-gray", na: "c-gray" };
const CHECK_WORD = { pass: "통과", fail: "실패", foreign: "남의 빨강", running: "도는 중", skipped: "못 돌림", todo: "아직", na: "해당 없음" };
const DOT = { pass: "●", fail: "✕", foreign: "△", running: "◐", skipped: "◌", todo: "○", na: "–" };

const WIDTH = 680;

function fail(message)
{
    console.error(`상태 파일이 어긋납니다: ${message}`);
    process.exit(1);
}

/** 상태 파일 하나를 재고 그대로 돌려준다. 어긋나면 끝낸다 */
export function validate(state, path)
{
    const at = (field) => `${path} 의 ${field}`;
    if (typeof state.issue !== "string" || state.issue.length === 0) fail(at("issue 가 없습니다"));
    if (typeof state.title !== "string" || state.title.length === 0) fail(at("title 이 없습니다"));
    if (typeof state.stages !== "object" || state.stages === null) fail(at("stages 가 없습니다"));
    for (const { key } of STAGES)
    {
        const value = state.stages[key];
        if (!STAGE_STATES.has(value)) fail(at(`stages.${key} 가 ${JSON.stringify(value)} 입니다. ${[...STAGE_STATES].join(" · ")} 가운데 하나여야 합니다`));
    }
    for (const key of Object.keys(state.stages))
    {
        if (!STAGES.some((stage) => stage.key === key)) fail(at(`stages.${key} 는 모르는 단계입니다`));
    }
    if (!Array.isArray(state.checks)) fail(at("checks 가 배열이 아닙니다"));
    for (const check of state.checks)
    {
        if (typeof check.name !== "string") fail(at("checks 의 한 줄에 name 이 없습니다"));
        if (!CHECK_STATES.has(check.state)) fail(at(`checks 「${check.name}」의 state 가 ${JSON.stringify(check.state)} 입니다`));
        // 못 돌린 것은 까닭이 그림의 알맹이다. 까닭 없이 「못 돌림」만 남으면 보는 사람이 다시 물어야 한다
        if (check.state === "skipped" && !check.detail) fail(at(`checks 「${check.name}」는 못 돌렸는데 detail 에 까닭이 없습니다`));
        if (check.state === "fail" && !check.detail) fail(at(`checks 「${check.name}」는 실패했는데 detail 에 무엇이 깨졌는지가 없습니다`));
        // 이번 변경과 무관한 빨강은 왜 무관한지가 있어야 「무시해도 되는 빨강」으로 읽힌다
        if (check.state === "foreign" && !check.detail) fail(at(`checks 「${check.name}」는 남의 빨강인데 detail 에 왜 무관한지가 없습니다`));
        const counted = check.passed !== undefined || check.total !== undefined;
        if (counted && !(Number.isInteger(check.passed) && Number.isInteger(check.total) && check.passed <= check.total))
        {
            fail(at(`checks 「${check.name}」의 passed · total 이 맞지 않습니다`));
        }
    }
    for (const test of state.newTests ?? [])
    {
        if (typeof test.name !== "string" || !CHECK_STATES.has(test.state)) fail(at("newTests 의 한 줄이 { name, state } 가 아닙니다"));
    }
    return state;
}

function escape(text)
{
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** 글자 폭을 어림한다. 한글과 넓은 기호는 글자 크기만큼, 나머지는 그 절반 남짓으로 본다 */
function measure(text, size)
{
    let width = 0;
    for (const char of text)
    {
        width += /[ᄀ-ￜ]/.test(char) ? size : size * 0.58;
    }
    return width;
}

function fit(text, size, room)
{
    if (measure(text, size) <= room) return text;
    let cut = "";
    for (const char of text)
    {
        if (measure(cut + char + "…", size) > room) break;
        cut += char;
    }
    return cut + "…";
}

function checkBadge(check)
{
    if (check.passed !== undefined && (check.state === "pass" || check.state === "fail" || check.state === "foreign"))
    {
        return `${check.passed}/${check.total} ${CHECK_WORD[check.state]}`;
    }
    return CHECK_WORD[check.state];
}

function timeLabel(state)
{
    if (!state.updated) return "";
    const date = new Date(state.updated);
    if (Number.isNaN(date.getTime())) return "";
    // 사용자가 한국 시간으로 읽으므로 KST 로 적는다
    const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const hh = String(kst.getUTCHours()).padStart(2, "0");
    const mm = String(kst.getUTCMinutes()).padStart(2, "0");
    return `${hh}:${mm} 기준`;
}

function stageStrip(state, y)
{
    const gap = 8;
    const box = (WIDTH - 20 - gap * (STAGES.length - 1)) / STAGES.length;
    const parts = [];
    STAGES.forEach(({ key, label }, index) =>
    {
        const x = 10 + index * (box + gap);
        const value = state.stages[key];
        // 색을 못 보는 사람도 읽게 모양으로도 가른다. 끝난 것은 실선, 남은 것은 점선, 해당 없는 것은 흐리게,
        // 하는 중은 굵은 글자, 막힌 것은 앞에 느낌표다
        const dash = value === "na" || value === "todo" ? ` stroke-dasharray="4 3"` : "";
        const faded = value === "na" ? ` opacity="0.45"` : "";
        const textClass = value === "doing" ? "th" : "ts";
        const mark = value === "blocked" ? "! " : "";
        parts.push(
            `<g class="${STAGE_CLASS[value]}"${faded}><rect x="${x}" y="${y}" width="${box}" height="40" rx="8"${dash}/>`
            + `<text class="${textClass}" x="${x + box / 2}" y="${y + 25}" text-anchor="middle">${escape(mark + label)}</text></g>`,
        );
        if (index < STAGES.length - 1)
        {
            parts.push(`<line class="arr" x1="${x + box + 1}" y1="${y + 20}" x2="${x + box + gap - 1}" y2="${y + 20}"/>`);
        }
    });
    return parts.join("");
}

/** 한 스레드를 한 장에 그린다 */
export function renderOne(state)
{
    const parts = [];
    let y = 22;
    const right = [state.pr ? `PR #${state.pr}` : "PR 아직", timeLabel(state)].filter(Boolean).join(" · ");
    parts.push(`<text class="th" x="10" y="${y}">${escape(fit(`${state.issue} · ${state.title}`, 14, WIDTH - 40 - measure(right, 12)))}</text>`);
    parts.push(`<text class="ts" x="${WIDTH - 10}" y="${y}" text-anchor="end">${escape(right)}</text>`);

    y += 18;
    parts.push(stageStrip(state, y));
    y += 40 + 34;

    parts.push(`<text class="th" x="10" y="${y}">테스트 현황</text>`);
    y += 12;
    for (const check of state.checks)
    {
        parts.push(`<text class="t" x="10" y="${y + 20}">${escape(fit(check.name, 14, 150))}</text>`);
        parts.push(
            `<g class="${CHECK_CLASS[check.state]}"><rect x="170" y="${y + 4}" width="112" height="24" rx="12"/>`
            + `<text class="ts" x="226" y="${y + 20}" text-anchor="middle">${escape(DOT[check.state] + " " + checkBadge(check))}</text></g>`,
        );
        if (check.detail) parts.push(`<text class="ts" x="296" y="${y + 20}">${escape(fit(check.detail, 12, WIDTH - 306))}</text>`);
        y += 32;
    }

    const newTests = state.newTests ?? [];
    if (newTests.length > 0)
    {
        const passed = newTests.filter((test) => test.state === "pass").length;
        y += 22;
        parts.push(`<text class="th" x="10" y="${y}">이번에 더한 테스트 ${passed}/${newTests.length} 초록</text>`);
        y += 8;
        const shown = newTests.slice(0, 10);
        for (const test of shown)
        {
            parts.push(
                `<g class="${CHECK_CLASS[test.state]}"><circle cx="18" cy="${y + 14}" r="5"/></g>`
                + `<text class="ts" x="32" y="${y + 18}">${escape(fit(test.name, 12, WIDTH - 42))}</text>`,
            );
            y += 22;
        }
        if (newTests.length > shown.length)
        {
            parts.push(`<text class="ts" x="32" y="${y + 18}">외 ${newTests.length - shown.length}개</text>`);
            y += 22;
        }
    }

    y += 14;
    const needs = state.needs ?? "필요한 것 없음";
    const needsClass = state.needs ? "c-amber" : "c-gray";
    parts.push(
        `<g class="${needsClass}"><rect x="10" y="${y}" width="${WIDTH - 20}" height="34" rx="8"/>`
        + `<text class="t" x="24" y="${y + 22}">${escape(fit(`필요한 것: ${needs}`, 14, WIDTH - 48))}</text></g>`,
    );
    y += 34 + 8;

    return svg(parts, y);
}

function testDigest(state)
{
    const counted = state.checks.filter((check) => check.passed !== undefined && check.state !== "foreign");
    const passed = counted.reduce((sum, check) => sum + check.passed, 0);
    const total = counted.reduce((sum, check) => sum + check.total, 0);
    const failed = state.checks.filter((check) => check.state === "fail").length;
    const skipped = state.checks.filter((check) => check.state === "skipped" || check.state === "foreign").length;
    const words = [];
    if (total > 0) words.push(`${passed}/${total}`);
    if (failed > 0) words.push(`실패 ${failed}`);
    if (skipped > 0) words.push(`확인 못 함 ${skipped}`);
    return { text: words.join(" · ") || "아직", worst: failed > 0 ? "fail" : skipped > 0 ? "skipped" : total > 0 ? "pass" : "todo" };
}

/** 여러 스레드를 한 줄씩 모아 그린다. 코디네이터가 「다들 어디까지 했나」에 답할 때 쓴다 */
export function renderMany(states)
{
    const parts = [];
    const dotX = 230;
    const dotGap = 20;
    const testX = dotX + dotGap * STAGES.length + 6;
    let y = 22;
    parts.push(`<text class="th" x="10" y="${y}">스레드</text>`);
    parts.push(`<text class="th" x="${dotX - 6}" y="${y}">이슈 → 머지</text>`);
    parts.push(`<text class="th" x="${testX}" y="${y}">테스트</text>`);
    y += 10;
    for (const state of states)
    {
        y += 30;
        parts.push(`<text class="t" x="10" y="${y}">${escape(fit(`${state.issue} ${state.title}`, 14, dotX - 24))}</text>`);
        STAGES.forEach(({ key }, index) =>
        {
            const value = state.stages[key];
            const cx = dotX + index * dotGap + 6;
            const shape = value === "todo" || value === "na"
                ? `<circle cx="${cx}" cy="${y - 5}" r="6" stroke-dasharray="2 2"/>`
                : `<circle cx="${cx}" cy="${y - 5}" r="7"/>`;
            const faded = value === "na" ? ` opacity="0.45"` : "";
            parts.push(`<g class="${STAGE_CLASS[value]}"${faded}>${shape}</g>`);
        });
        const digest = testDigest(state);
        parts.push(
            `<g class="${CHECK_CLASS[digest.worst]}"><rect x="${testX}" y="${y - 18}" width="156" height="24" rx="12"/>`
            + `<text class="ts" x="${testX + 78}" y="${y - 2}" text-anchor="middle">${escape(fit(digest.text, 12, 146))}</text></g>`,
        );
        const needs = state.needs ? state.needs : "";
        parts.push(`<text class="ts" x="${testX + 166}" y="${y - 2}">${escape(fit(needs, 12, WIDTH - testX - 176))}</text>`);
    }
    return svg(parts, y + 16);
}

/** 체크리스트 머리에 붙이는 한 줄. 그림을 다시 붙이지 않는 사이에도 테스트 현황이 보이게 한다 */
export function summaryLine(state)
{
    const parts = state.checks
        .filter((check) => check.state !== "na")
        .map((check) =>
        {
            const counts = check.passed !== undefined ? ` ${check.passed}/${check.total}` : "";
            return `${check.name}${counts} ${DOT[check.state]}`;
        });
    return parts.join(" · ");
}

function svg(parts, height)
{
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${Math.ceil(height)}" width="100%">${parts.join("")}</svg>`;
}

function main()
{
    const args = process.argv.slice(2);
    const summary = args[0] === "--summary";
    const paths = summary ? args.slice(1) : args;
    if (paths.length === 0)
    {
        console.error("사용법: node render.mjs [--summary] <상태.json> [상태.json …]");
        process.exit(2);
    }
    const states = paths.map((path) =>
    {
        let parsed;
        try
        {
            parsed = JSON.parse(readFileSync(path, "utf8"));
        }
        catch (error)
        {
            fail(`${path} 를 JSON 으로 읽지 못했습니다(${error.message})`);
        }
        return validate(parsed, path);
    });
    if (summary)
    {
        console.log(states.map(summaryLine).join("\n"));
        return;
    }
    console.log(states.length === 1 ? renderOne(states[0]) : renderMany(states));
}

if (import.meta.url === `file://${process.argv[1]}`) main();

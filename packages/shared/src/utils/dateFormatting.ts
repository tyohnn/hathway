/**
 * 날짜 포맷팅 유틸리티
 *
 * dateUtils.ts에서 포맷 함수 군을 분리합니다.
 * KST 타임존 핵심 유틸(getMonthRangeInUTC, getCurrentKSTDate 등)은 dateUtils.ts에 유지됩니다.
 *
 * 기존 코드 호환성:
 *   import { formatDateShort } from '@investment/shared/utils/dateUtils': dateUtils.ts가 이 파일을 re-export하므로 유지됩니다.
 *   import { formatDateShort } from '@investment/shared/utils/dateFormatting': 직접 import도 가능합니다.
 */

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';

// dayjs 플러그인 등록 (dateUtils.ts와 중복되어도 idempotent하게 동작)
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.locale('ko');

/**
 * === Date Format Functions Summary ===
 *
 * | Function               | TZ          | Format                 | Separator |
 * |------------------------|-------------|------------------------|-----------|
 * | formatDateToString     | Local       | YYYY-MM-DD             | dash      |
 * | formatToYYYYMMDD       | Local       | YYYY.MM.DD             | dot       |
 * | formatDateShort        | KST (fixed) | YYYY.MM.DD             | dot       |
 * | formatDateTime         | KST (fixed) | YYYY.MM.DD HH:mm       | dot       |
 * | formatKstDateTime      | KST (fixed) | YYYY.MM.DD HH:mm:ss    | dot       |
 * | formatToYYYYMMDDLocal  | = formatToYYYYMMDD (alias)                        |
 * | formatToYYYYMMDDKST    | = formatDateShort (alias)                         |
 */

/**
 * 날짜를 YY.MM.DD 형식으로 포맷팅합니다 (브라우저 로컬 타임존)
 * KST 기준이 필요한 경우 formatDateShort() 사용
 *
 * @param dateString ISO 날짜 문자열 또는 Date 객체
 * @returns YY.MM.DD 형식의 문자열
 */
export function formatToYYMMDD(dateString: string | Date | null | undefined): string
{
    if (!dateString) return '-';

    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    return `${year}.${month}.${day}`;
}

/**
 * 날짜를 YYYY.MM.DD 형식으로 포맷팅합니다.
 *
 * - 타임존: **브라우저 로컬 타임존** (JavaScript Date의 getFullYear/getMonth/getDate 사용)
 * - KST 기준이 명확히 필요한 경우에는 formatDateShort()를 사용하세요.
 *
 * @param dateString - ISO 날짜 문자열 또는 Date 객체 (null/undefined일 경우 '-' 반환)
 */
export function formatToYYYYMMDD(dateString?: string | Date | null): string
{
    if (!dateString) return '-';

    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    return `${year}.${month}.${day}`;
}

/**
 * 날짜를 YYYY.MM.DD HH:mm 형식으로 포맷팅합니다 (브라우저 로컬 타임존 기준)
 * KST 기준이 필요한 경우 formatDateTime() 사용
 */
export function formatToYYYYMMDDHHmm(dateString: string | Date): string
{
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${year}.${month}.${day} ${hours}:${minutes}`;
}

/**
 * 날짜를 M/D 형식으로 포맷팅합니다 (짧은 형식)
 */
export function formatToShortDate(dateString: string | null): string
{
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 날짜를 YYYY-MM-DD HH:mm 형식으로 포맷팅합니다 (24시간 형식, 하이픈 구분)
 */
export function formatToYYYYMMDDHHmmWithDash(dateString: string | Date): string
{
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 날짜를 YYYY.MM.DD 오전/오후 HH:mm 형식으로 포맷팅합니다
 */
export function formatToYYYYMMDDWithAMPM(dateString: string | Date): string
{
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');

    const period = hours < 12 ? '오전' : '오후';
    const displayHours = hours % 12 || 12;

    return `${year}.${month}.${day} ${period} ${displayHours}:${minutes}`;
}

/**
 * 날짜를 YYYY.MM.DD 형식으로 포맷팅합니다.
 *
 * - 타임존: **KST (Asia/Seoul, UTC+9)** 고정 (dayjs.tz 사용)
 * - UTC로 저장된 날짜를 한국 시간 기준으로 정확히 표시해야 하는 경우 사용.
 *   로컬 타임존 기준으로 충분한 경우에는 formatToYYYYMMDD()를 사용하세요.
 */
export function formatDateShort(date: string | Date | null | undefined): string
{
    if (!date) return '-';
    return dayjs(date).tz('Asia/Seoul').format('YYYY.MM.DD');
}

/**
 * 날짜를 YYYY.MM.DD HH:mm 형식으로 포맷팅합니다 (KST 기준, dayjs 사용)
 * 로컬 타임존 기준이 충분한 경우 formatToYYYYMMDDHHmm() 사용
 */
export function formatDateTime(date: string | Date | null | undefined): string
{
    if (!date) return '-';
    return dayjs(date).tz('Asia/Seoul').format('YYYY.MM.DD HH:mm');
}

/**
 * 날짜+시각을 초 단위까지 KST 고정으로 포맷팅합니다 (예: "2024.04.15 14:30:45")
 *
 * dayjs.tz('Asia/Seoul')로 서버(UTC)/클라이언트 로케일 차이를 모두 흡수.
 * 프로젝트 다른 포맷터(formatDateTime, formatDateShort 등)와 동일 스택을 사용한다.
 */
export function formatKstDateTime(date: string | Date | null | undefined): string
{
    if (!date) return '-';
    const d = dayjs(date);
    if (!d.isValid()) return '-';
    return d.tz('Asia/Seoul').format('YYYY.MM.DD HH:mm:ss');
}

interface FormatDateTimeKROptions
{
    includeTime?: boolean;
    monthFormat?: 'short' | 'long';
}

/**
 * 날짜를 한국어 형식으로 포맷팅합니다 (KST 기준)
 */
export function formatDateTimeKR(
    date: string | Date | null | undefined,
    options: FormatDateTimeKROptions = {}
): string
{
    if (!date) return '-';
    const { includeTime = true, monthFormat = 'long' } = options;
    const d = dayjs(date).tz('Asia/Seoul');

    if (monthFormat === 'short')
    {
        return includeTime
            ? d.format('YY.MM.DD HH:mm')
            : d.format('YY.MM.DD');
    }

    return includeTime
        ? d.format('YYYY년 MM월 DD일 HH:mm')
        : d.format('YYYY년 MM월 DD일');
}

/**
 * datetime-local input용 포맷 (YYYY-MM-DDTHH:mm)
 */
export function formatDateTimeForInput(date: string | Date): string
{
    if (!date) return '';

    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * datetime-local 값을 ISO string으로 변환
 */
export function convertDateTimeLocalToISO(datetimeLocal: string): string
{
    if (!datetimeLocal) return '';

    try
    {
        const date = new Date(datetimeLocal);
        if (isNaN(date.getTime())) return '';
        return date.toISOString();
    }
    catch
    {
        return '';
    }
}

/**
 * TIMESTAMPTZ(ISO) 문자열을 datetime-local input 값(YYYY-MM-DDTHH:mm)으로 변환
 * 브라우저 로컬 타임존 기준으로 변환합니다.
 */
export function convertTimestamptzToDatetimeLocal(isoString: string): string
{
    if (!isoString) return '';

    const d = dayjs(isoString);
    if (!d.isValid()) return '';

    return d.format('YYYY-MM-DDTHH:mm');
}

/**
 * 날짜를 한국 공식 형식(YYYY. MM. DD.)으로 포맷팅합니다
 */
export function formatToKoreanOfficial(dateString: string | Date | null | undefined): string
{
    if (!dateString) return '-';

    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '-';

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}. ${month}. ${day}.`;
}

/**
 * 날짜 문자열에서 'YY.MM' 형식의 월 키를 추출합니다.
 * @returns 'YY.MM' 형식 (예: '24.10')
 */
export function getYYMMMonthKey(dateString: string): string
{
    const date = new Date(dateString);
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}.${month}`;
}

/**
 * actual_hours와 due_date로부터 start_time/end_time을 생성 (클라이언트 전용)
 * @note 클라이언트 전용 함수. 서버 환경에서는 시스템 타임존 기준으로 동작하므로 사용 금지
 */
export function generateTimesFromActualHours(
    dueDate: string,
    actualHours: number
): { start_time: string; end_time: string }
{
    const dateOnly = dueDate.split('T')[0];
    const startTime = `${dateOnly}T00:00`;
    const startDate = new Date(`${dateOnly}T00:00:00`);
    const endDate = new Date(startDate.getTime() + actualHours * 60 * 60 * 1000);
    const endTime = formatDateTimeForInput(endDate);
    return { start_time: startTime, end_time: endTime };
}

// ============================================================
// 한국어 날짜·시간 표시 (toLocaleDateString 기반)
// ============================================================

/**
 * 날짜를 한국어 간결 형식으로 포맷팅합니다.
 * 예: "2024. 3. 15. 오후 2:30"
 *
 * - 브라우저/서버 로컬 타임존 기반 (Intl.DateTimeFormat 사용)
 * - admin 첨부파일 목록 등 간결한 날짜·시간 표시에 사용
 */
export function formatDateKRShort(dateString: string): string
{
    return dayjs(dateString).tz('Asia/Seoul').format('YYYY. M. D. A h:mm');
}

// ============================================================
// 한국어 날짜 포맷 (계약서, 이메일 등)
// ============================================================

/**
 * YYYY-MM-DD → yyyy년 mm월 dd일
 * 법적 문서·이메일 본문에서 사용
 */
export function formatDateToKorean(dateStr: string): string
{
    const [year, month, day] = dateStr.split('-');
    return `${year}년 ${String(Number(month)).padStart(2, '0')}월 ${String(Number(day)).padStart(2, '0')}일`;
}

/**
 * KST 기준 오늘 날짜를 YYYY-MM-DD 형식으로 반환
 * dayjs.tz를 사용하여 서버(UTC) 환경에서도 안전
 */
export function getTodayKSTString(): string
{
    return dayjs().tz('Asia/Seoul').format('YYYY-MM-DD');
}

/**
 * KST 기준 오늘 날짜를 yyyy년 mm월 dd일 형식으로 반환
 */
export function getTodayKorean(): string
{
    return formatDateToKorean(getTodayKSTString());
}

/**
 * ISO 날짜를 간결한 한국어 날짜+시간으로 포맷
 * 예: "3월 15일 오후 02:30"
 * 문서 버전 목록 등에서 사용
 *
 * dayjs.tz('Asia/Seoul') 기반으로 서버/클라이언트 환경에 관계없이 KST 결과를 보장한다.
 */
export function formatDocDate(dateStr: string): string
{
    const d = dayjs(dateStr).tz('Asia/Seoul');
    const hour = d.hour();
    const period = hour < 12 ? '오전' : '오후';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${d.month() + 1}월 ${d.date()}일 ${period} ${String(hour12).padStart(2, '0')}:${String(d.minute()).padStart(2, '0')}`;
}

// ============================================================
// 타임존 명확화 별칭 (신규 코드에서 사용 권장)
// formatToYYYYMMDD → 로컬 타임존, formatDateShort → KST 고정
// ============================================================
/** YYYY.MM.DD (로컬 타임존): formatToYYYYMMDD의 명시적 별칭 */
export const formatToYYYYMMDDLocal = formatToYYYYMMDD;
/** YYYY.MM.DD (KST 고정): formatDateShort의 명시적 별칭 */
export const formatToYYYYMMDDKST = formatDateShort;

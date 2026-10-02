/**
 * 숫자 및 통화 포맷팅 유틸리티 함수
 */

/**
 * 숫자를 천 단위 구분 기호가 포함된 문자열로 포맷팅
 * @param value - 포맷팅할 숫자 또는 문자열
 * @returns 천 단위 구분 기호가 포함된 문자열 (예: "1,234,567")
 */
export const formatNumberWithCommas = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return ''
  const num = typeof value === 'string' ? value.replace(/,/g, '') : value.toString()
  const numberValue = parseFloat(num)
  if (isNaN(numberValue)) return ''
  return numberValue.toLocaleString('ko-KR')
}

/**
 * 문자열에서 쉼표 제거
 * @param value - 쉼표를 제거할 문자열
 * @returns 쉼표가 제거된 문자열
 */
export const removeCommas = (value: string): string => {
  return value.replace(/,/g, '')
}

/**
 * 문자열을 숫자로 파싱 (쉼표 제거 후)
 * @param value - 파싱할 문자열
 * @returns 파싱된 숫자 (실패 시 0)
 */
export const parseNumber = (value: string): number => {
  const cleanValue = removeCommas(value)
  const numberValue = Number(cleanValue)
  return isNaN(numberValue) ? 0 : numberValue
}

/**
 * 금액을 한국 원화 형식으로 포맷팅
 * @param amount - 포맷팅할 금액
 * @returns 포맷된 통화 문자열 (예: "₩1,234,567")
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * 금액을 "원" 접미사 형식으로 포맷팅
 *
 * - 값이 `null`/`undefined`/비유한수인 경우 `options.fallback` 반환 (기본 빈 문자열).
 *   과거 `formatPriceWithWonOrDash`와 동일한 null-safe 동작을 `fallback: '-'`로 표현.
 * @param amount - 포맷팅할 금액
 * @param options.fallback - 금액이 없거나 유효하지 않을 때 반환할 문자열 (기본 `''`)
 * @returns 포맷된 금액 문자열 (예: "1,234,567원") 또는 fallback
 */
export const formatPriceWithWon = (
    amount: number | null | undefined,
    options: { fallback?: string } = {},
): string =>
{
    const { fallback = '' } = options;
    if (amount === null || amount === undefined || !Number.isFinite(amount)) return fallback;
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
};

/**
 * 근무 시간을 포맷팅
 * @param hours - 시간 수
 * @returns 포맷된 시간 문자열 (예: "8.5시간")
 */
export const formatHours = (hours: number): string => {
  return `${hours.toFixed(1)}시간`
}

/**
 * 금액을 축약형으로 포맷팅 (억/만 단위)
 * @param value - 포맷팅할 금액
 * @returns 축약형 금액 문자열 (예: "1.5억원", "500만원", "10,000원")
 */
export const formatCurrencyShort = (value: number): string =>
{
  if (value >= 100000000)
  {
    return `${(value / 100000000).toFixed(1)}억원`
  }
  if (value >= 10000)
  {
    return `${Math.round(value / 10000).toLocaleString()}만원`
  }
  return `${value.toLocaleString()}원`
}

/**
 * 사업자등록번호 포맷팅 (xxx-xx-xxxxx)
 * @param num - 사업자등록번호 (10자리 숫자 또는 하이픈 포함 문자열)
 * @returns 포맷된 사업자등록번호 (예: "123-45-67890"), 값이 없으면 '-'
 */
export const formatBusinessNumber = (num: string | null | undefined): string =>
{
  if (!num) return '-'
  const cleaned = num.replace(/\D/g, '')
  if (cleaned.length !== 10) return num
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`
}

/**
 * 문자열에서 숫자만 추출
 * @param value - 숫자를 추출할 문자열
 * @returns 숫자만 포함된 문자열 (예: "010-1234-5678" -> "01012345678")
 */
export const extractNumbers = (value: string): string =>
{
  return value.replace(/[^0-9]/g, '')
}

/**
 * 전화번호를 한국 표준 형식으로 포맷팅
 * 서울 02, 지역번호, 휴대폰 번호 모두 처리
 * @param phone - 포맷팅할 전화번호
 * @returns 포맷된 전화번호 (예: "010-1234-5678", "02-123-4567")
 */
export const formatPhoneNumber = (phone: string | null | undefined): string =>
{
  if (!phone) return '-'

  // 숫자만 추출
  const numbers = phone.replace(/[^0-9]/g, '')

  // 길이가 9자리 미만이면 원본 반환
  if (numbers.length < 9)
  {
    return phone
  }

  // 휴대폰 번호 (010, 011, 016, 017, 018, 019)
  if (numbers.startsWith('010') || numbers.startsWith('011') ||
      numbers.startsWith('016') || numbers.startsWith('017') ||
      numbers.startsWith('018') || numbers.startsWith('019'))
  {
    if (numbers.length === 11)
    {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
    }
  }

  // 서울 지역번호 (02)
  if (numbers.startsWith('02'))
  {
    if (numbers.length === 9)
    {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 5)}-${numbers.slice(5)}`
    }
    else if (numbers.length === 10)
    {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`
    }
  }

  // 기타 지역번호 (3자리)
  if (numbers.length === 10)
  {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`
  }
  else if (numbers.length === 11)
  {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`
  }

  // 형식을 알 수 없는 경우 원본 반환
  return phone
}

/**
 * 13자리 등록번호 포맷팅 (XXXXXX-XXXXXXX)
 * 법인등록번호, 주민등록번호 공통 포맷
 */
const formatRegistrationNumber13 = (num: string | null | undefined): string =>
{
    if (!num) return '-';
    const cleaned = num.replace(/\D/g, '');
    if (cleaned.length !== 13) return num;
    return `${cleaned.slice(0, 6)}-${cleaned.slice(6)}`;
};

/**
 * 법인등록번호 포맷팅 (XXXXXX-XXXXXXX, 13자리)
 */
export const formatCorporateNumber = formatRegistrationNumber13;

/**
 * 주민등록번호 포맷팅 (XXXXXX-XXXXXXX, 13자리)
 */
export const formatResidentNumber = formatRegistrationNumber13;

export { formatRegistrationNumber13 as formatRegistrationNumber };

/**
 * 법인/주민등록번호 입력용 포맷팅 (XXXXXX-XXXXXXX, 입력 중에도 대시 표시)
 * @param num - 숫자 문자열
 * @returns 입력 중 포맷팅된 문자열 (빈 값이면 '')
 */
export const formatRegistrationNumberInput = (num: string | null | undefined): string =>
{
  if (!num) return ''
  const cleaned = num.replace(/\D/g, '')
  if (cleaned.length <= 6) return cleaned
  return `${cleaned.slice(0, 6)}-${cleaned.slice(6, 13)}`
}

/**
 * 이메일 유효성 검사
 * @param email - 검사할 이메일 주소
 * @returns 유효하면 true
 */
export const isValidEmail = (email: string | null | undefined): boolean =>
{
  if (!email || email.trim() === '') return true // 빈 값은 유효로 처리
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// ============================================================
// 한국어 금액 텍스트 변환 (법적 문서용)
// ============================================================

/**
 * 금액 숫자를 한국어 텍스트로 변환
 * 법적 관례: 단위 시작 시 일(一) 접두사 사용 (일백, 일천 등)
 */
export function convertToKoreanAmount(amount: number): string
{
    if (amount === 0)
    {
        return '영';
    }

    const units = ['', '만', '억', '조'];
    const digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
    const subUnits = ['', '십', '백', '천'];

    const parts: string[] = [];
    let remaining = amount;
    let unitIndex = 0;

    while (remaining > 0)
    {
        const chunk = remaining % 10000;
        if (chunk > 0)
        {
            const chunkStr = convertChunk(chunk, digits, subUnits);
            const unitLabel = unitIndex < units.length ? units[unitIndex] : `(10^${unitIndex * 4})`;
            parts.unshift(`${chunkStr}${unitLabel}`);
        }
        remaining = Math.floor(remaining / 10000);
        unitIndex++;
    }

    return parts.join('');
}

/**
 * 4자리 이하 숫자를 한국어로 변환
 * 법적 관례: 백, 천 앞에 1이면 '일' 표기 (일백, 일천)
 */
function convertChunk(
    chunk: number,
    digits: string[],
    subUnits: string[],
): string
{
    let result = '';
    let remaining = chunk;
    let position = 0;

    while (remaining > 0)
    {
        const digit = remaining % 10;
        if (digit > 0)
        {
            // 법적 관례: 십/백/천 앞의 1은 '일'로 표기
            const digitStr = (digit === 1 && position > 0)
                ? '일'
                : digits[digit];
            result = `${digitStr}${subUnits[position]}${result}`;
        }
        remaining = Math.floor(remaining / 10);
        position++;
    }

    return result;
}

/** 이메일 주소 부분 마스킹 (로그용): user@example.com → us***@example.com */
export function maskEmail(email: string): string
{
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    const visible = local.slice(0, Math.min(2, local.length));
    return `${visible}***@${domain}`;
}

/** HTML 특수문자 이스케이프 (XSS 방어) */
export function escapeHtml(str: string | undefined | null): string
{
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

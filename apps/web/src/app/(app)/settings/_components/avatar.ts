/** 아바타 바탕의 색조. 시스템의 아바타(`AvatarFallback data-tone`)가 아는 이름이다 */
export const AVATAR_TONES = ["slate", "teal", "plum", "olive", "rust", "navy", "moss", "mauve"] as const;

export type AvatarTone = (typeof AVATAR_TONES)[number];

/**
 * 한 사람의 아바타 색조. 같은 열쇠는 어느 화면에서나 같은 색이다.
 *
 * ⚠ 열쇠는 이름이 아니라 **이메일**을 넘긴다. 이름은 내 계정 화면에서 바뀌고, 그때마다 색이 바뀌면 같은 사람으로 읽히지 않는다.
 */
export const avatarTone = (key: string): AvatarTone =>
{
    const sum = [...key].reduce((total, char) => total + (char.codePointAt(0) ?? 0), 0);

    return AVATAR_TONES[sum % AVATAR_TONES.length] ?? "slate";
};

/**
 * 아바타에 적는 한 글자. 이름의 첫 글자이고 영문은 대문자로 적는다. 이름이 없는 사람(초대만 받은 사람)은 이메일을 넘긴다.
 *
 * ⚠ 코드 포인트로 자른다. 앞 한 `char` 만 떼면 이모지와 일부 한자가 반쪽으로 깨진다.
 */
export const initialOf = (name: string): string => ([...name.trim()][0] ?? "").toUpperCase();

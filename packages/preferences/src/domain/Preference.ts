import { Schema } from "effect";

/**
 * 사람 하나가 조직 하나 안에서 고른 설정. 플러그인의 설정 화면이 이 값을 그대로 읽고 쓴다.
 *
 * ⚠ **칸은 여기서만 는다.** 칸을 더하면 표(`preferences.member_preference`)와 어댑터와 판정(`rules/update.ts`)이
 *    함께 는다. 범용 열쇠-값 표로 두지 않은 것은 어휘 밖의 값이 조용히 들어오는 길을 막으려는 것이다.
 * ⚠ **공개 범위의 어휘는 쪽지 도메인의 것과 글자가 같다.** 도메인 패키지끼리는 서로를 부르지 않으므로 여기 한 벌을
 *    더 둔다. 쪽지의 어휘가 늘면 앱의 조립(플러그인 모듈)이 타입에서 먼저 어긋난다.
 */
export const DefaultVisibility = Schema.Literals(["private", "tenant"]);

export type DefaultVisibility = typeof DefaultVisibility.Type;

export const Preferences = Schema.Struct({
    /** 공개 범위를 말하지 않고 쓰는 새 쪽지가 따르는 값 */
    defaultVisibility: DefaultVisibility,
    /** 보관한 쪽지도 목록에 싣는가 */
    showArchived: Schema.Boolean,
});

export type Preferences = typeof Preferences.Type;

/** 고른 적이 없는 사람이 쓰는 값. 표의 칸에는 기본값을 두지 않고 어댑터가 이 값을 넘긴다 */
export const DEFAULT_PREFERENCES: Preferences = { defaultVisibility: "tenant", showArchived: false };

/** 고칠 칸만 든 값. 판정(`planPreferenceUpdate`)을 지난 것만 이 모양이 된다 */
export type PreferenceChanges = Partial<Preferences>;

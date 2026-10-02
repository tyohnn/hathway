import { SectionPlaceholder } from "@investment/blocks/section-placeholder";
import { getTheme, getThemeSection, type ThemeId, type ThemeSectionId } from "@/lib/nav";

/** 아직 화면이 붙지 않은 섹션. 무엇이 이 자리에 서는지를 블록(`SectionPlaceholder`)으로 적는다 */
export function ThemeSectionPlaceholder({
    theme,
    section,
    note,
}: {
    theme: ThemeId;
    section: ThemeSectionId;
    note?: string;
})
{
    const themeMeta = getTheme(theme);
    const sectionMeta = getThemeSection(section);

    return (
        <SectionPlaceholder
            title={sectionMeta.label}
            body={note ?? `${themeMeta.label}의 ${sectionMeta.label} 화면은 아직 없어요.`}
        />
    );
}

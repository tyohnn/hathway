// `@hathway/ui/icons` 에 시맨틱 이름이 없는 hugeicons 글리프. `packages/ui` 는 tyohnn 이 생성한 파일이라
// 손으로 고치지 않으므로(`CLAUDE.md` 「코드 스타일」), 이 블록들이 쓰는 나머지 아홉 개는 여기서 그린다.
// packages/ui/src/icons/libraries/hugeicons.tsx 와 같은 규격이다. 24px 박스, strokeWidth 2(hugeicons 기본은 1.5).

import {
    ArrowLeftDoubleIcon,
    ArrowRightDoubleIcon,
    ClipboardPasteIcon,
    CompassIcon,
    EyeOffIcon,
    GripVerticalIcon,
    PauseIcon,
    PinOffIcon,
    Wrench01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import type { IconProps } from "@hathway/ui/icons/names";

const icon = (glyph: IconSvgElement) =>
{
    const Icon = ({ strokeWidth, ...props }: IconProps) => (
        <HugeiconsIcon icon={glyph} size={24} strokeWidth={strokeWidth === undefined ? 2 : Number(strokeWidth)} {...props} />
    );

    return Icon;
};

export const ChevronsLeft = icon(ArrowLeftDoubleIcon);
export const ChevronsRight = icon(ArrowRightDoubleIcon);
export const ClipboardPaste = icon(ClipboardPasteIcon);
export const Compass = icon(CompassIcon);
export const EyeOff = icon(EyeOffIcon);
export const GripVertical = icon(GripVerticalIcon);
export const Pause = icon(PauseIcon);
export const PinOff = icon(PinOffIcon);
export const Wrench = icon(Wrench01Icon);

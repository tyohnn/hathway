// `@investment/ui/icons` 에 시맨틱 이름이 없는 phosphor 글리프. `packages/ui` 는 tyohnn 이 생성한 파일이라
// 손으로 고치지 않으므로, 블록들이 쓰는 나머지 아홉 개는 여기서 그린다.
// packages/ui/src/icons/libraries/phosphor.tsx 와 같은 규격이다. 24px 박스와 regular 굵기다.
// ⚠ 스캐폴드의 이 파일은 hugeicons 로 그린다. 이 저장소는 UI 패키지가 phosphor 를 입어서 같은 이름을 phosphor 로 다시 이었다.

import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import {
    CaretDoubleLeftIcon,
    CaretDoubleRightIcon,
    ClipboardTextIcon,
    CompassIcon,
    DotsSixVerticalIcon,
    EyeSlashIcon,
    PauseIcon,
    PushPinSlashIcon,
    WrenchIcon,
} from "@phosphor-icons/react";

import type { IconProps } from "@investment/ui/icons/names";

const icon = (Glyph: PhosphorIcon) =>
{
    const Icon = (props: IconProps) => <Glyph size={24} weight="regular" strokeWidth={2} {...props} />;

    return Icon;
};

export const ChevronsLeft = icon(CaretDoubleLeftIcon);
export const ChevronsRight = icon(CaretDoubleRightIcon);
export const ClipboardPaste = icon(ClipboardTextIcon);
export const Compass = icon(CompassIcon);
export const EyeOff = icon(EyeSlashIcon);
export const GripVertical = icon(DotsSixVerticalIcon);
export const Pause = icon(PauseIcon);
export const PinOff = icon(PushPinSlashIcon);
export const Wrench = icon(WrenchIcon);

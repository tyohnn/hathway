"use client";

import { useState } from "react";

import { Slider } from "@hathway/ui/components/slider";
import { HintField } from "@hathway/ui/blocks/hint-field";

/**
 * One number set with a slider: its name, the current value at the end of the label line, and the slider under
 * it. A run parameter (temperature, a limit), a threshold. Controlled with `value`, or it keeps its own value
 * from `defaultValue`. `loading` keeps the label, draws a bar for the value and the slider disabled at its
 * lowest: where it stands is what it waits for.
 */
export const SliderField = ({
    id,
    label,
    value,
    defaultValue,
    onValueChange,
    min,
    max,
    step,
    format = String,
    loading,
}: {
    id: string;
    label: string;
    value?: number;
    defaultValue?: number;
    onValueChange?: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    /** How the value is written at the end of the label line */
    format?: (value: number) => string;
    loading?: boolean;
}) =>
{
    const [own, setOwn] = useState(defaultValue ?? min ?? 0);
    const current = loading ? min ?? 0 : value ?? own;

    return (
        <HintField id={id} label={label} hint={format(current)} loading={loading}>
            <Slider
                id={id}
                value={[current]}
                onValueChange={(next) =>
                {
                    const number = Array.isArray(next) ? next[0] : next;

                    setOwn(number);
                    onValueChange?.(number);
                }}
                min={min}
                max={max}
                step={step}
                disabled={loading}
                aria-label={label}
            />
        </HintField>
    );
};

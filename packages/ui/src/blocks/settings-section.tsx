import type { ReactNode } from "react";

import { FieldDescription, FieldLegend, FieldSet } from "@hathway/ui/components/field";

/**
 * One section of a settings form: what it is about as the legend, a sentence under it, and its fields. Put a
 * `FieldSeparator` between sections.
 */
export const SettingsSection = ({ title, description, children, className }: { title: ReactNode; description?: ReactNode; children?: ReactNode; className?: string }) => (
    <FieldSet className={className}>
        <FieldLegend>{title}</FieldLegend>
        {description !== undefined && <FieldDescription>{description}</FieldDescription>}
        {children}
    </FieldSet>
);

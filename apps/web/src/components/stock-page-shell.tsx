import type { ReactNode } from "react";
import type { Company } from "@investment/schema";
import { CompanyHeader } from "@/components/company-header";

export function StockPageShell({
    company,
    children,
}: {
    company: Company;
    children: ReactNode;
})
{
    return (
        <div className="flex flex-col gap-6">
            <CompanyHeader company={company} />
            <div>{children}</div>
        </div>
    );
}

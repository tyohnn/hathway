import { Skeleton } from "@investment/ui/components/skeleton";
import { cn } from "@investment/ui/lib/utils";

export interface UploadDropzoneSkeletonProps
{
    readonly className?: string;
}

/** 드롭존이 오기 전의 자리. context 없이 선다 */
export function UploadDropzoneSkeleton({ className }: UploadDropzoneSkeletonProps)
{
    return (
        <Skeleton
            data-slot="upload-dropzone-skeleton"
            className={cn("h-40 w-full", className)}
            style={{ borderRadius: "var(--surface-radius)" }}
        />
    );
}

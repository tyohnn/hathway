"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Card } from "@investment/ui/components/card";
import { cn } from "@/lib/cn";

/**
 * Card shell with a restrained hover lift — transform + shadow only, ~200ms,
 * no bounce or scale-in (Emil Kowalski's "motion should feel like feedback,
 * not decoration" principle). Only this shell hydrates; the card content
 * passed as `children` stays server-rendered.
 *
 * `data-motion-card` is the selector StaggerReveal (./stagger-reveal) uses
 * to find cards for the mount-time entrance stagger.
 */
export function MotionCard({
    as = "article",
    className,
    children,
    ...props
}: {
    as?: ElementType;
    className?: string;
    children: ReactNode;
} & React.HTMLAttributes<HTMLElement>)
{
    const ref = useRef<HTMLElement>(null);
    const Tag = as;

    useGSAP(
        () =>
        {
            const el = ref.current;
            if (!el) return;

            const mm = gsap.matchMedia();
            mm.add("(prefers-reduced-motion: no-preference)", () =>
            {
                const yTo = gsap.quickTo(el, "y", { duration: 0.2, ease: "power2.out" });
                const scaleTo = gsap.quickTo(el, "scale", { duration: 0.2, ease: "power2.out" });

                const enter = () =>
                {
                    yTo(-3);
                    scaleTo(1.006);
                };
                const leave = () =>
                {
                    yTo(0);
                    scaleTo(1);
                };

                el.addEventListener("pointerenter", enter);
                el.addEventListener("pointerleave", leave);
                return () =>
                {
                    el.removeEventListener("pointerenter", enter);
                    el.removeEventListener("pointerleave", leave);
                };
            });

            return () => mm.revert();
        },
        { scope: ref },
    );

    return (
        <Tag
            ref={ref}
            data-motion-card
            className={cn(
                "shadow-[var(--shadow-card)] transition-shadow duration-200 hover:shadow-[var(--shadow-card-hover)]",
                className,
            )}
            {...props}
        >
            {children}
        </Tag>
    );
}

/**
 * 시스템의 `Card` 에 같은 움직임을 얹은 것. 면과 여백은 `Card` 가 정한다.
 *
 * ⚠ 서버 컴포넌트는 클라이언트 컴포넌트에 함수(`as={Card}`)를 넘기지 못한다. 그래서 고르는 일을 이 파일 안에서 한다.
 */
export function MotionSurface({ className, children }: { className?: string; children: ReactNode })
{
    return <MotionCard as={Card} {...(className === undefined ? {} : { className })}>{children}</MotionCard>;
}

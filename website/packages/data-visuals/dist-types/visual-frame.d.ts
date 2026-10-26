import type { ComponentPropsWithoutRef, ReactNode } from 'react';
type VisualFrameProps = ComponentPropsWithoutRef<'section'> & {
    children: ReactNode;
};
export declare function VisualFrame({ children, className, ...props }: VisualFrameProps): import("react").JSX.Element;
type VisualHeaderProps = {
    eyebrow?: string;
    title: string;
    subtitle?: string;
};
export declare function VisualHeader({ eyebrow, title, subtitle, }: VisualHeaderProps): import("react").JSX.Element;
type VisualAnnotationProps = {
    children: ReactNode;
};
export declare function VisualAnnotation({ children }: VisualAnnotationProps): import("react").JSX.Element;
type VisualSourceProps = {
    children: ReactNode;
};
export declare function VisualSource({ children }: VisualSourceProps): import("react").JSX.Element;
export {};

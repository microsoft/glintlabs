import type { ReactNode } from 'react';
export type GlintResearchCardTag = {
    iconSrc: string;
    label: string;
};
export type GlintResearchCardProps = {
    actionLabel?: string;
    description: string;
    href: string;
    tags: readonly GlintResearchCardTag[];
    title: string;
    visualAlt?: string;
    visualSrc: string;
};
export declare function GlintResearchCard({ actionLabel, description, href, tags, title, visualAlt, visualSrc, }: GlintResearchCardProps): import("react").JSX.Element;
export type GlintTrendingCardProps = {
    detail: string;
    detailIcon?: ReactNode;
    href: string;
    rank: number;
    title: string;
};
export declare function GlintTrendingCard({ detail, detailIcon, href, rank, title, }: GlintTrendingCardProps): import("react").JSX.Element;
export type GlintToolCardProps = {
    actionLabel: string;
    badge: string;
    badgeIcon?: ReactNode;
    description: string;
    href: string;
    imageAlt?: string;
    imageSrc: string;
    theme: 'green' | 'cyan' | 'violet';
    title: string;
};
export declare function GlintToolCard({ actionLabel, badge, badgeIcon, description, href, imageAlt, imageSrc, theme, title, }: GlintToolCardProps): import("react").JSX.Element;
export type GlintResourceLinkRowProps = {
    actionLabel?: string;
    description: string;
    href: string;
    icon: ReactNode;
    title: string;
};
export declare function GlintResourceLinkRow({ actionLabel, description, href, icon, title, }: GlintResourceLinkRowProps): import("react").JSX.Element;

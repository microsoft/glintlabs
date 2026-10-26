export type GlintLabsNavigationItem = {
    label: string;
    href: string;
};
export type GlintLabsNavigationProps = {
    brand: GlintLabsNavigationItem;
    items: readonly GlintLabsNavigationItem[];
    variant?: 'core' | 'annual-report-2026';
};
export declare function GlintLabsNavigation({ brand, items, variant, }: GlintLabsNavigationProps): import("react").JSX.Element;

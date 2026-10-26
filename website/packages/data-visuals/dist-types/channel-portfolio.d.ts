export type ChannelPortfolioItem = {
    id: string;
    title: string;
    value: number;
    color: string;
    selectedBackground?: string;
    selectedBorder?: string;
    description: string;
    examples: readonly string[];
};
export type ChannelPortfolioProps = {
    items?: readonly ChannelPortfolioItem[];
    selectedId?: string;
    defaultSelectedId?: string;
    onSelectedIdChange?: (selectedId: string) => void;
    eyebrow?: string;
    title?: string;
    description?: string;
};
export declare function ChannelPortfolio({ items, selectedId, defaultSelectedId, onSelectedIdChange, eyebrow, title, description, }: ChannelPortfolioProps): import("react").JSX.Element;

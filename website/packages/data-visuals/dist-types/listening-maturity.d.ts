export type ListeningMaturityPattern = 'constrained' | 'uneven' | 'embedded';
export type ListeningMaturityOption = {
    pattern: ListeningMaturityPattern;
    label: string;
};
export type ListeningMaturityCapability = {
    id: string;
    title: string;
    question: string;
    color: string;
    options: readonly ListeningMaturityOption[];
    next: string;
};
export type ListeningMaturitySelections = Partial<Record<string, ListeningMaturityPattern>>;
export type ListeningMaturityProps = {
    capabilities?: readonly ListeningMaturityCapability[];
    selections?: ListeningMaturitySelections;
    defaultSelections?: ListeningMaturitySelections;
    onSelectionsChange?: (selections: ListeningMaturitySelections) => void;
    eyebrow?: string;
    title?: string;
    description?: string;
    resultPanelTop?: string;
};
export declare function ListeningMaturity({ capabilities, selections, defaultSelections, onSelectionsChange, eyebrow, title, description, resultPanelTop, }: ListeningMaturityProps): import("react").JSX.Element;

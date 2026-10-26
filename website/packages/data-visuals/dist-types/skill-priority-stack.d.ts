export type SkillPriorityLayer = {
    badge: string;
    percentage: number;
    skill: string;
    summary: string;
    details: readonly string[];
};
export type SkillPriorityStackProps = {
    eyebrow: string;
    title: string;
    description: string;
    layers: readonly SkillPriorityLayer[];
};
export declare function SkillPriorityStack({ eyebrow, title, description, layers, }: SkillPriorityStackProps): import("react").JSX.Element;

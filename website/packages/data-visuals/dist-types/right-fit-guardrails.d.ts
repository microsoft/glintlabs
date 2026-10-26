export type GuardrailContent = {
    label: string;
    question: string;
};
export type RightFitGuardrailsProps = {
    title: string;
    description: string;
    trustworthy: GuardrailContent;
    intelligent: GuardrailContent;
    embedded: GuardrailContent;
    responsive: GuardrailContent;
    outcomeDriven: GuardrailContent;
    centerLabel: string;
    centerStatement: string;
    centerConstraint: string;
    footer: string;
};
export declare function RightFitGuardrails({ title, description, trustworthy, intelligent, embedded, responsive, outcomeDriven, centerLabel, centerStatement, centerConstraint, footer, }: RightFitGuardrailsProps): import("react").JSX.Element;

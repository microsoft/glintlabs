export type EmployeeAiReadinessMetric = {
    id: string;
    label: string;
    value: string;
    description: string;
    percentage: number;
    detail: string;
    color: string;
    background: string;
    border: string;
    track: string;
};
export type EmployeeAiReadinessProps = {
    metrics?: readonly EmployeeAiReadinessMetric[];
    title?: string;
    description?: string;
    insight?: string;
};
export declare function EmployeeAiReadiness({ metrics, title, description, insight, }: EmployeeAiReadinessProps): import("react").JSX.Element;

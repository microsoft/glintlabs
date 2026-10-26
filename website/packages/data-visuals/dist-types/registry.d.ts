export type VisualStatus = 'draft' | 'review' | 'approved' | 'deprecated';
export type VisualCollectionId = 'glint-labs-core' | 'annual-report-2026';
export type VisualCollection = {
    id: VisualCollectionId;
    name: string;
    description: string;
};
export type VisualCapability = 'interactive' | 'keyboard' | 'responsive' | 'reduced-motion' | 'static-export' | 'table-fallback';
export type VisualDataField = {
    name: string;
    type: 'string' | 'number' | 'color';
    required: boolean;
    description: string;
    constraints?: string;
};
export type VisualDefinition = {
    id: string;
    name: string;
    collection: VisualCollectionId;
    version: number;
    status: VisualStatus;
    description: string;
    useWhen: readonly string[];
    avoidWhen: readonly string[];
    dataContract: {
        shape: string;
        minimumItems?: number;
        maximumItems?: number;
        fields: readonly VisualDataField[];
    };
    capabilities: readonly VisualCapability[];
    figma: {
        status: 'needs-component' | 'linked';
        fileKey: string;
        nodeId?: string;
        url?: string;
    };
    publishingStudio: {
        adapterId: string;
        compatibility: 'planned' | 'available';
        sourceShape: string;
        manifestBlockType?: string;
    };
};
export declare const visualCollections: readonly [{
    readonly id: "glint-labs-core";
    readonly name: "Glint Labs Core";
    readonly description: "Site-wide interface components shared across Glint Labs experiences.";
}, {
    readonly id: "annual-report-2026";
    readonly name: "2026 Annual Report";
    readonly description: "Canonical editorial and data-storytelling components for the 2026 report.";
}];
export declare const glintLabsNavigationDefinition: VisualDefinition;
export declare const annualReportNavigationDefinition: VisualDefinition;
export declare const glintResearchCardDefinition: VisualDefinition;
export declare const glintTrendingCardDefinition: VisualDefinition;
export declare const glintToolCardDefinition: VisualDefinition;
export declare const glintResourceLinkRowDefinition: VisualDefinition;
export declare const pullQuoteDefinition: VisualDefinition;
export declare const leadStatementDefinition: VisualDefinition;
export declare const outcomeMetricCardDefinition: VisualDefinition;
export declare const outcomeFocusCardDefinition: VisualDefinition;
export declare const dataInsightCardDefinition: VisualDefinition;
export declare const rightFitGuardrailsDefinition: VisualDefinition;
export declare const skillPriorityStackDefinition: VisualDefinition;
export declare const listeningSpeedGapDefinition: VisualDefinition;
export declare const channelPortfolioDefinition: VisualDefinition;
export declare const listeningMaturityDefinition: VisualDefinition;
export declare const employeeAiReadinessDefinition: VisualDefinition;
export declare const visualRegistry: readonly [VisualDefinition, VisualDefinition, VisualDefinition, VisualDefinition, VisualDefinition, VisualDefinition, VisualDefinition, VisualDefinition, VisualDefinition, VisualDefinition, VisualDefinition, VisualDefinition, VisualDefinition, VisualDefinition, VisualDefinition, VisualDefinition, VisualDefinition];
export declare function getVisualDefinition(id: string): VisualDefinition | undefined;
export declare function getVisualsByCollection(collection: VisualCollectionId): VisualDefinition[];

import { type ReactNode } from 'react';
import type { PercentBarDatum } from '../types';
type RootProps = {
    data: readonly PercentBarDatum[];
    children: ReactNode;
    selectedId?: string | null;
    defaultSelectedId?: string | null;
    onSelectedChange?: (id: string) => void;
};
declare function Root({ data, children, selectedId: controlledSelectedId, defaultSelectedId, onSelectedChange, }: RootProps): import("react").JSX.Element;
type PlotProps = {
    ariaLabel?: string;
};
declare function Plot({ ariaLabel }: PlotProps): import("react").JSX.Element;
declare function Legend(): import("react").JSX.Element;
type SelectionDetailProps = {
    emptyText?: string;
};
declare function SelectionDetail({ emptyText, }: SelectionDetailProps): import("react").JSX.Element;
type DataTableProps = {
    summary?: string;
};
declare function DataTable({ summary }: DataTableProps): import("react").JSX.Element;
export declare const PercentBarComparison: {
    Root: typeof Root;
    Plot: typeof Plot;
    Legend: typeof Legend;
    SelectionDetail: typeof SelectionDetail;
    DataTable: typeof DataTable;
};
export {};

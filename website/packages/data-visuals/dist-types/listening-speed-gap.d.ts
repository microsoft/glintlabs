declare const listeningFitStates: readonly [{
    readonly id: "minimum";
    readonly markerCount: 1;
    readonly zone: "Insufficient signal";
    readonly title: "Important changes may be going unheard";
    readonly description: "With few listening moments, shifts can go undetected until decisions are underway or conditions have already changed.";
    readonly action: "Start with the highest-priority business questions and add a timely listening channel.";
    readonly positive: false;
}, {
    readonly id: "low";
    readonly markerCount: 3;
    readonly zone: "Insufficient signal";
    readonly title: "Your listening approach may leave important signal gaps";
    readonly description: "Current business questions can remain unanswered while understanding becomes outdated between listening moments.";
    readonly action: "Add or diversify listening where decisions lack timely, relevant evidence.";
    readonly positive: false;
}, {
    readonly id: "balanced";
    readonly markerCount: 5;
    readonly zone: "Right-fit listening";
    readonly title: "Signal and synthesis are in balance";
    readonly description: "Listening is frequent enough to keep understanding current without outpacing the organization’s ability to interpret and act.";
    readonly action: "What change in priorities or pace would require reassessing this balance?";
    readonly positive: true;
}, {
    readonly id: "high";
    readonly markerCount: 10;
    readonly zone: "Synthesis overload";
    readonly title: "Feedback may be arriving faster than it can be used";
    readonly description: "More collection can create synthesis backlog, delay action, and ask employees for input without a visible response.";
    readonly action: "Prioritize key questions, sequence collection, or increase synthesis capacity.";
    readonly positive: false;
}, {
    readonly id: "overload";
    readonly markerCount: 16;
    readonly zone: "Synthesis overload";
    readonly title: "Listening volume is outpacing synthesis capacity";
    readonly description: "A growing backlog can make feedback stale, obscure priorities, and weaken trust when employees do not see a visible response.";
    readonly action: "Pause lower-priority collection, clear the synthesis backlog, and close the loop before adding new listening.";
    readonly positive: false;
}];
export type ListeningFit = (typeof listeningFitStates)[number]['id'];
export type ListeningSpeedGapProps = {
    defaultFit?: ListeningFit;
    description?: string;
    eyebrow?: string;
    fit?: ListeningFit;
    onFitChange?: (fit: ListeningFit) => void;
    title?: string;
};
export declare function ListeningSpeedGap({ defaultFit, description, eyebrow, fit, onFitChange, title, }: ListeningSpeedGapProps): import("react").JSX.Element;
export {};

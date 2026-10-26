export type FeaturedIllustration = {
  id: string;
  label: string;
  src: `/figma/illustrations/blue/${string}.png`;
  figmaNodeId: string;
  alt: "";
};

function illustration(id: string, label: string, nodeId: number): FeaturedIllustration {
  return {
    id,
    label,
    src: `/figma/illustrations/blue/${id}.png` as const,
    figmaNodeId: `1658:${nodeId}`,
    alt: "",
  };
}

// Blue set: https://www.figma.com/design/rkrC8mdVsXC1rAITLp04Sq/Glint-Labs?node-id=1658-50849
export const featuredIllustrations = [
  illustration("report", "Report", 50850),
  illustration("photo", "Photo", 50851),
  illustration("people", "People", 50852),
  illustration("sign-in", "Sign in", 50853),
  illustration("data-flow", "Data flow", 50854),
  illustration("data-workflow", "Data workflow", 50855),
  illustration("device-laptop", "Device laptop", 50856),
  illustration("document-image", "Document image", 50857),
  illustration("document-add-text", "Document add text", 50858),
  illustration("document-edit-text", "Document edit text", 50859),
  illustration("shield", "Shield", 50860),
  illustration("settings", "Settings", 50861),
  illustration("data", "Data", 50862),
  illustration("dashboard", "Dashboard", 50863),
  illustration("create", "Create", 50864),
  illustration("content-table", "Content table", 50865),
  illustration("compass", "Compass", 50866),
  illustration("traffic-light", "Traffic light", 50867),
  illustration("trophy", "Trophy", 50868),
  illustration("task", "Task", 50869),
  illustration("search", "Search", 50870),
  illustration("scan-shield", "Scan shield", 50871),
  illustration("web-multiple", "Web multiple", 50872),
  illustration("clock", "Clock", 50873),
  illustration("arrange", "Arrange", 50874),
  illustration("agents-workflow", "Agents workflow", 50875),
  illustration("chat-multimodal", "Chat multimodal", 50876),
  illustration("chat", "Chat", 50877),
  illustration("notification", "Notification", 50878),
  illustration("keys", "Keys", 50879),
  illustration("lock", "Lock", 50880),
  illustration("inbox-empty", "Inbox empty", 50881),
  illustration("inbox", "Inbox", 50882),
  illustration("food", "Food", 50883),
  illustration("flowers", "Flowers", 50884),
  illustration("email-mention", "Email mention", 50885),
  illustration("email", "Email", 50886),
  illustration("file", "File", 50887),
  illustration("catalog", "Catalog", 50888),
  illustration("calendar", "Calendar", 50889),
  illustration("briefcase", "Briefcase", 50890),
  illustration("book-categories", "Book categories", 50891),
  illustration("book", "Book", 50892),
  illustration("arrow-upload", "Arrow upload", 50893),
  illustration("agents", "Agents", 50894),
  illustration("celebration", "Celebration", 50895),
  illustration("notebook", "Notebook", 50896),
  illustration("news", "News", 50897),
  illustration("plan", "Plan", 50898),
  illustration("favorite", "Favorite", 50899),
  illustration("document-recent", "Document recent", 50900),
  illustration("wifi-dismissed", "Wi-Fi disconnected", 50901),
  illustration("wifi-checkmark", "Wi-Fi connected", 50902),
  illustration("loading", "Loading", 50903),
  illustration("approved", "Approved", 50905),
  illustration("error", "Error", 50906),
] as const satisfies readonly FeaturedIllustration[];

export const featuredIllustrationPaths = new Set<string>(
  featuredIllustrations.map(({ src }) => src),
);

export const publicationIllustrations = featuredIllustrations.map(image => ({
  ...image,
  description: `${image.label} illustration.`,
}));

export function isRetiredIllustration(source: string) {
  return source.startsWith("/figma/illustrations/") &&
    !featuredIllustrationPaths.has(source);
}

// Historical previews retain their exact artwork; these are not picker options.
export const legacyFeaturedIllustrationPaths = new Set<string>([
  "calendar", "arrow-progress", "arrows", "email", "energy", "food", "laptop",
  "laptop-shield", "link", "prohibited", "progress", "puzzle", "tasks", "share",
  "shield", "arrow-up", "clock", "checkmark", "data", "books", "chat",
  "celebration", "flag", "folder", "hourglass", "inbox", "keys", "documents",
  "design-layout", "lock", "location-light-mode", "pencil", "mic-multiple",
  "m365-folder", "network", "notification", "people", "person-checkmark",
  "person-grid", "person-signin", "search", "photos", "plants", "star",
  "transcribe", "trashcan", "warning", "workspace", "wifi-checkmark", "tree",
].map(id => `/figma/illustrations/${id}.png`));

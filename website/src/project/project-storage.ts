import {
  parseStudioProject,
  type StudioProject,
} from "./studio-project.ts";

const PROJECT_KEY_PREFIX = "glint-publishing-studio:project:";
const PROJECT_INDEX_KEY = "glint-publishing-studio:projects";
const PROJECT_DATABASE_NAME = "glint-publishing-studio";
const PROJECT_DATABASE_VERSION = 1;
const PROJECT_STORE_NAME = "projects";

export type StoredProjectSummary = {
  id: string;
  title: string;
  status: StudioProject["status"];
  updatedAt: string;
};

export interface ProjectStorage {
  list(): Promise<StudioProject[]>;
  load(id: string): Promise<StudioProject>;
  save(project: StudioProject): Promise<void>;
}

export interface ProjectRecordStore {
  list(): Promise<unknown[]>;
  load(id: string): Promise<unknown | undefined>;
  save(project: StudioProject): Promise<void>;
}

let projectDatabasePromise: Promise<IDBDatabase> | undefined;

function openProjectDatabase() {
  if (!projectDatabasePromise) {
    projectDatabasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(
        PROJECT_DATABASE_NAME,
        PROJECT_DATABASE_VERSION,
      );
      request.addEventListener("upgradeneeded", () => {
        if (!request.result.objectStoreNames.contains(PROJECT_STORE_NAME)) {
          request.result.createObjectStore(PROJECT_STORE_NAME, {
            keyPath: "id",
          });
        }
      });
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () =>
        reject(request.error ?? new Error("Browser project storage failed.")),
      );
      request.addEventListener("blocked", () =>
        reject(
          new Error(
            "Browser project storage is blocked by another open Studio tab.",
          ),
        ),
      );
    });
  }
  return projectDatabasePromise;
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () =>
      reject(request.error ?? new Error("Browser project storage failed.")),
    );
  });
}

class IndexedDbProjectRecordStore implements ProjectRecordStore {
  async list() {
    const database = await openProjectDatabase();
    const transaction = database.transaction(PROJECT_STORE_NAME, "readonly");
    return requestResult(transaction.objectStore(PROJECT_STORE_NAME).getAll());
  }

  async load(id: string) {
    const database = await openProjectDatabase();
    const transaction = database.transaction(PROJECT_STORE_NAME, "readonly");
    return requestResult(
      transaction.objectStore(PROJECT_STORE_NAME).get(id),
    );
  }

  async save(project: StudioProject) {
    const database = await openProjectDatabase();
    const transaction = database.transaction(PROJECT_STORE_NAME, "readwrite");
    await new Promise<void>((resolve, reject) => {
      transaction.addEventListener("complete", () => resolve());
      transaction.addEventListener("abort", () =>
        reject(
          transaction.error ?? new Error("Browser project storage failed."),
        ),
      );
      transaction.addEventListener("error", () =>
        reject(
          transaction.error ?? new Error("Browser project storage failed."),
        ),
      );
      transaction.objectStore(PROJECT_STORE_NAME).put(project);
    });
  }
}

function readLegacyIndex(storage: Storage) {
  const value = storage.getItem(PROJECT_INDEX_KEY);
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (
      !Array.isArray(parsed) ||
      parsed.some((item) => typeof item !== "string")
    ) {
      throw new Error("The saved project index is malformed.");
    }
    return parsed as string[];
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Saved projects could not be listed: ${error.message}`
        : "Saved projects could not be listed.",
    );
  }
}

function parseStoredProject(value: unknown) {
  try {
    return parseStudioProject(
      typeof value === "string" ? JSON.parse(value) : value,
    );
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `The saved Studio project is invalid: ${error.message}`
        : "The saved Studio project is invalid.",
    );
  }
}

function projectStorageError(error: unknown) {
  const name =
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
      ? error.name
      : undefined;
  if (name === "QuotaExceededError") {
    return new Error(
      "This browser does not have enough storage for the report and its source evidence. Free browser storage or use a different browser profile, then save again.",
    );
  }
  return new Error(
    error instanceof Error
      ? `The Studio project could not be saved: ${error.message}`
      : "The Studio project could not be saved in this browser.",
  );
}

export class BrowserProjectStorage implements ProjectStorage {
  private readonly legacyStorage: Storage;
  private readonly records: ProjectRecordStore;

  constructor(
    legacyStorage: Storage,
    records: ProjectRecordStore = new IndexedDbProjectRecordStore(),
  ) {
    this.legacyStorage = legacyStorage;
    this.records = records;
  }

  async list() {
    await this.migrateLegacyProjects();
    const projects = (await this.records.list()).map(parseStoredProject);
    return projects.toSorted((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt),
    );
  }

  async load(id: string) {
    const stored = await this.records.load(id);
    if (stored !== undefined) {
      return parseStoredProject(stored);
    }

    const legacyValue = this.legacyStorage.getItem(
      `${PROJECT_KEY_PREFIX}${id}`,
    );
    if (!legacyValue) {
      throw new Error("The saved Studio project could not be found.");
    }
    const project = parseStoredProject(legacyValue);
    await this.save(project);
    this.removeLegacyProject(id);
    return project;
  }

  async save(project: StudioProject) {
    const parsed = parseStudioProject(project);
    try {
      await this.records.save(parsed);
    } catch (error) {
      throw projectStorageError(error);
    }
  }

  private async migrateLegacyProjects() {
    for (const id of readLegacyIndex(this.legacyStorage)) {
      if ((await this.records.load(id)) === undefined) {
        const value = this.legacyStorage.getItem(
          `${PROJECT_KEY_PREFIX}${id}`,
        );
        if (value) {
          await this.save(parseStoredProject(value));
        }
      }
      this.legacyStorage.removeItem(`${PROJECT_KEY_PREFIX}${id}`);
    }
    this.legacyStorage.removeItem(PROJECT_INDEX_KEY);
  }

  private removeLegacyProject(id: string) {
    this.legacyStorage.removeItem(`${PROJECT_KEY_PREFIX}${id}`);
    const remainingIds = readLegacyIndex(this.legacyStorage).filter(
      (projectId) => projectId !== id,
    );
    if (remainingIds.length > 0) {
      this.legacyStorage.setItem(
        PROJECT_INDEX_KEY,
        JSON.stringify(remainingIds),
      );
    } else {
      this.legacyStorage.removeItem(PROJECT_INDEX_KEY);
    }
  }
}

export class LocalProjectStorage {
  private readonly storage: Storage;

  constructor(storage: Storage) {
    this.storage = storage;
  }

  list(): StudioProject[] {
    return readLegacyIndex(this.storage)
      .map((id) => this.load(id))
      .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  load(id: string): StudioProject {
    const value = this.storage.getItem(`${PROJECT_KEY_PREFIX}${id}`);
    if (!value) {
      throw new Error("The saved Studio project could not be found.");
    }
    return parseStoredProject(value);
  }

  save(project: StudioProject): void {
    const parsed = parseStudioProject(project);
    this.storage.setItem(
      `${PROJECT_KEY_PREFIX}${parsed.id}`,
      JSON.stringify(parsed),
    );
    const ids = readLegacyIndex(this.storage).filter(
      (id) => id !== parsed.id,
    );
    this.storage.setItem(
      PROJECT_INDEX_KEY,
      JSON.stringify([parsed.id, ...ids]),
    );
  }
}

export function projectSummary(project: StudioProject): StoredProjectSummary {
  return {
    id: project.id,
    title: project.manifest.metadata.title,
    status: project.status,
    updatedAt: project.updatedAt,
  };
}

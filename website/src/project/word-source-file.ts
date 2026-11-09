export interface WordSourceHandle {
  name: string;
  getFile(): Promise<File>;
  queryPermission?(options: { mode: "read" }): Promise<PermissionState>;
  requestPermission?(options: { mode: "read" }): Promise<PermissionState>;
}

type WordSourcePicker = (options: {
  id: string;
  multiple: false;
}) => Promise<WordSourceHandle[]>;

export function wordSourcePicker() {
  return (window as Window & { showOpenFilePicker?: WordSourcePicker }).showOpenFilePicker?.bind(window);
}

export async function chooseWordSource(picker: WordSourcePicker) {
  const [handle] = await picker({
    id: "publishing-studio-word",
    multiple: false,
  });
  return handle;
}

export async function readWordSource(handle: WordSourceHandle) {
  let permission = await handle.queryPermission?.({ mode: "read" });
  if (permission && permission !== "granted") {
    permission = await handle.requestPermission?.({ mode: "read" });
    if (permission !== "granted") {
      throw new DOMException("Word file access wasn't allowed. Your draft hasn't changed.", "NotAllowedError");
    }
  }
  return handle.getFile();
}

// Keep browser-only handles outside portable, JSON-serializable Studio projects.
function sourceDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("glint-publishing-studio-word-sources", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("sources");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savedSourceHandle<Handle>(key: string): Promise<Handle | undefined> {
  const database = await sourceDatabase();
  try {
    return await new Promise<Handle | undefined>((resolve, reject) => {
      const request = database.transaction("sources").objectStore("sources").get(key);
      request.onsuccess = () => resolve(request.result as Handle | undefined);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

export async function rememberSourceHandle(key: string, handle: unknown) {
  const database = await sourceDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("sources", "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
      transaction.objectStore("sources").put(handle, key);
    });
  } finally {
    database.close();
  }

}

export function savedWordSource(projectId: string) {
  return savedSourceHandle<WordSourceHandle>(projectId);
}

export function rememberWordSource(projectId: string, handle: WordSourceHandle) {
  return rememberSourceHandle(projectId, handle);
}

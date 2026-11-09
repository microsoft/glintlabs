import { rememberSourceHandle, savedSourceHandle, type WordSourceHandle } from "./word-source-file.ts";

export interface SourceFolderHandle {
  name: string;
  getFileHandle(name: string): Promise<WordSourceHandle>;
  queryPermission?(options: { mode: "read" }): Promise<PermissionState>;
  requestPermission?(options: { mode: "read" }): Promise<PermissionState>;
}

type SourceFolderPicker = (options: { id: string; mode: "read" }) => Promise<SourceFolderHandle>;

export class SourceFolderError extends Error {
  readonly kind: "permission" | "missing" | "other";
  readonly fileName?: string;
  constructor(kind: SourceFolderError["kind"], message: string, fileName?: string) {
    super(message);
    this.name = "SourceFolderError";
    this.kind = kind;
    this.fileName = fileName;
  }
}

export async function sourceFolderPermission(folder: SourceFolderHandle): Promise<PermissionState | "unknown"> {
  try { return await folder.queryPermission?.({ mode: "read" }) ?? "unknown"; }
  catch { return "unknown"; }
}

export function sourceFolderProblem(error: unknown, fileName?: string) {
  if (error instanceof SourceFolderError) return error;
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return new SourceFolderError("permission", "Allow folder access to read the saved Word and Excel files. Your draft hasn't changed.");
  }
  if (name === "NotFoundError") {
    return new SourceFolderError("missing", `"${fileName ?? "The source file"}" wasn't found. Choose the folder containing the Word report and its linked Excel workbook. Your draft hasn't changed.`, fileName);
  }
  return new SourceFolderError("other", error instanceof Error ? error.message : "The source folder couldn't be read. Choose the folder again. Your draft hasn't changed.");
}

export async function allowSourceFolderAccess(folder: SourceFolderHandle) {
  const permission = await folder.requestPermission?.({ mode: "read" }) ?? await sourceFolderPermission(folder);
  if (permission !== "granted" && permission !== "unknown") {
    throw new SourceFolderError("permission", "Source folder access wasn't allowed. Choose Allow folder access to try again. Your draft hasn't changed.");
  }
}

export function sourceFolderPicker() {
  return (window as Window & { showDirectoryPicker?: SourceFolderPicker }).showDirectoryPicker?.bind(window);
}

export function chooseSourceFolder(picker: SourceFolderPicker) {
  return picker({ id: "publishing-studio-sources", mode: "read" });
}

export async function sourceFolderFile(folder: SourceFolderHandle, fileName: string) {
  if (!fileName || fileName.length > 255 || /[/\\\0]/.test(fileName) || fileName === "." || fileName === "..") {
    throw new Error("The linked source must be a file in the connected source folder.");
  }
  const permission = await sourceFolderPermission(folder);
  if (permission === "prompt" || permission === "denied") {
    throw new SourceFolderError("permission", "Source folder access wasn't allowed. Choose Allow folder access to continue. Your draft hasn't changed.");
  }
  try { return await folder.getFileHandle(fileName); }
  catch (cause) {
    if (cause instanceof DOMException && cause.name === "NotFoundError") {
      throw new SourceFolderError("missing", `"${fileName}" wasn't found in "${folder.name}". Choose the folder containing the Word report and its linked Excel workbook. Your draft hasn't changed.`, fileName);
    }
    throw sourceFolderProblem(cause, fileName);
  }
}

export function savedSourceFolder(projectId?: string) {
  return savedSourceHandle<SourceFolderHandle>(`source-folder:${projectId ?? "last"}`);
}

export function rememberSourceFolder(folder: SourceFolderHandle, projectId?: string) {
  return rememberSourceHandle(`source-folder:${projectId ?? "last"}`, folder);
}

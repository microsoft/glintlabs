import assert from "node:assert/strict";
import test from "node:test";

import { chooseWordSource, readWordSource } from "./word-source-file.ts";
import { allowSourceFolderAccess, chooseSourceFolder, SourceFolderError, sourceFolderFile, sourceFolderPermission } from "./source-folder.ts";

test("Word reconnect does not ask the native chooser to filter out files before Studio validation", async () => {
  const handle = { name: "report.docx", getFile: async () => new File(["Report"], "report.docx") };
  let options: Record<string, unknown> = {};
  const selected = await chooseWordSource(async value => {
    options = value;
    return [handle];
  });
  assert.equal(selected, handle);
  assert.equal(options.types, undefined);
  assert.notEqual(options.excludeAcceptAllOption, true);
});

test("refresh reads newly saved file content without requesting permission again when already granted", async () => {
  let text = "Original";
  const handle = {
    name: "report.docx",
    queryPermission: async () => "granted" as const,
    requestPermission: async () => { throw new Error("Permission must not be requested again."); },
    getFile: async () => new File([text], "report.docx"),
  };
  assert.equal(await (await readWordSource(handle)).text(), "Original");
  text = "Saved revision";
  assert.equal(await (await readWordSource(handle)).text(), "Saved revision");
});

test("refresh requests read-only access and never reads a denied source", async () => {
  let requested: unknown;
  const handle = {
    name: "report.docx",
    queryPermission: async () => "prompt" as const,
    requestPermission: async (options: { mode: "read" }) => {
      requested = options;
      return "denied" as const;
    },
    getFile: async () => { throw new Error("A denied source must not be read."); },
  };
  await assert.rejects(() => readWordSource(handle), { name: "NotAllowedError" });
  assert.deepEqual(requested, { mode: "read" });
});

test("remembered source folders do not request permission while importing or restoring a draft", async () => {
  let requested: unknown;
  const folder = { name: "Sources",
    queryPermission: async () => "prompt" as const,
    requestPermission: async (options: { mode: "read" }) => { requested = options; return "denied" as const; },
    getFileHandle: async () => { throw new Error("Do not read a denied directory."); },
  };
  await chooseSourceFolder(async options => {
    assert.deepEqual(options, { id: "publishing-studio-sources", mode: "read" });
    return folder;
  });
  await assert.rejects(sourceFolderFile(folder, "Research.xlsx"), /Source folder access wasn't allowed/);
  assert.equal(requested, undefined, "Only an explicit Allow folder access action may request permission");
});

test("source-folder resolution cannot follow absolute links or escape into sibling folders", async () => {
  const folder = { name: "Sources", getFileHandle: async () => { throw new Error("No path lookup is allowed."); } };
  for (const name of ["../private.xlsx", "subfolder/data.xlsx", "C:\\data.xlsx", "file:///data.xlsx", ".."]) {
    await assert.rejects(sourceFolderFile(folder, name), /file in the connected source folder/);
  }
});

test("folder permission is checked quietly and requested only by the explicit access action", async () => {
  let permission: PermissionState = "prompt";
  let requests = 0;
  const folder = { name: "Sources",
    queryPermission: async () => permission,
    requestPermission: async (options: { mode: "read" }) => {
      assert.deepEqual(options, { mode: "read" });
      requests++;
      permission = "granted";
      return permission;
    },
    getFileHandle: async () => ({ name: "Research.xlsx", getFile: async () => new File(["Data"], "Research.xlsx") }),
  };
  assert.equal(await sourceFolderPermission(folder), "prompt");
  assert.equal(requests, 0);
  await assert.rejects(sourceFolderFile(folder, "Research.xlsx"),
    error => error instanceof SourceFolderError && error.kind === "permission");
  await allowSourceFolderAccess(folder);
  assert.equal(requests, 1);
  assert.equal(await (await (await sourceFolderFile(folder, "Research.xlsx")).getFile()).text(), "Data");
  assert.equal(requests, 1);
});

test("missing workbooks retain their filename independently of folder permission", async () => {
  const folder = { name: "Sources", queryPermission: async () => "granted" as const,
    getFileHandle: async () => { throw new DOMException("Missing", "NotFoundError"); },
  };
  await assert.rejects(sourceFolderFile(folder, "Research.xlsx"), error =>
    error instanceof SourceFolderError && error.kind === "missing" && error.fileName === "Research.xlsx");
  assert.equal(await sourceFolderPermission(folder), "granted");
});

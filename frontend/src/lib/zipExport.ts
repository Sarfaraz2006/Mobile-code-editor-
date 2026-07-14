// Zip export – bundles the entire workspace into a single .zip and either
// downloads it (web) or shares it via the OS share sheet (native).
import JSZip from "jszip";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { FileNode, readFile, listWorkspace } from "@/src/lib/fs";

function flatten(tree: FileNode[]): FileNode[] {
  const out: FileNode[] = [];
  const walk = (nodes: FileNode[]) => {
    for (const n of nodes) {
      if (n.isDirectory) walk(n.children || []);
      else out.push(n);
    }
  };
  walk(tree);
  return out;
}

export async function exportWorkspaceZip(name = "codecraft-project"): Promise<{
  ok: boolean;
  reason?: string;
  fileCount: number;
}> {
  const tree = await listWorkspace();
  const files = flatten(tree);
  if (files.length === 0) return { ok: false, reason: "Workspace is empty", fileCount: 0 };

  const zip = new JSZip();
  for (const f of files) {
    try {
      const content = await readFile(f.path);
      zip.file(f.path, content);
    } catch {}
  }
  const filename = `${name}.zip`;

  if (Platform.OS === "web") {
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    return { ok: true, fileCount: files.length };
  }

  // Native: write to cacheDirectory then share.
  const base64 = await zip.generateAsync({ type: "base64" });
  const uri = (FileSystem.cacheDirectory ?? "") + filename;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/zip",
      dialogTitle: `Export ${name}`,
      UTI: "public.zip-archive",
    });
    return { ok: true, fileCount: files.length };
  }
  return {
    ok: false,
    reason: `Sharing not available. File saved to ${uri}`,
    fileCount: files.length,
  };
}

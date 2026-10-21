import { backupSource } from "./model";
import type { LedgerState } from "../types";
export function downloadFile(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function saveBackup(state: LedgerState) {
  const content = backupSource(state);
  const browser = window as unknown as {
    showSaveFilePicker?: (options: unknown) => Promise<{
      createWritable: () => Promise<{
        write: (text: string) => Promise<void>;
        close: () => Promise<void>;
      }>;
    }>;
  };
  if (browser.showSaveFilePicker)
    try {
      const file = await browser.showSaveFilePicker({
        suggestedName: "savedata.js",
        types: [
          {
            description: "Moneywise backup",
            accept: { "text/javascript": [".js"] },
          },
        ],
      });
      const output = await file.createWritable();
      await output.write(content);
      await output.close();
      return true;
    } catch (error) {
      if ((error as Error).name === "AbortError") return false;
    }
  downloadFile(content, "savedata.js", "text/javascript;charset=utf-8");
  return true;
}

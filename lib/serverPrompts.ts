import { readFile } from "fs/promises";
import path from "path";

export type PromptMode = "baihuo" | "fushi" | "custom";

const FILES: Record<Exclude<PromptMode, "custom">, string> = {
  baihuo: "baihuo.md",
  fushi: "fushi.md",
};

const cache = new Map<string, string>();

export async function loadPrompt(mode: Exclude<PromptMode, "custom">): Promise<string> {
  const cached = cache.get(mode);
  if (cached) return cached;
  const file = path.join(process.cwd(), "lib", "prompts", FILES[mode]);
  const text = await readFile(file, "utf8");
  cache.set(mode, text);
  return text;
}

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readProjectFile(path) {
  return readFileSync(join(root, path), "utf8");
}

const promptPath = join(root, "lib/prompts/neiyi.md");
assert.ok(existsSync(promptPath), "应存在 neiyi prompt 文件");

const prompt = readFileSync(promptPath, "utf8");
for (const requiredText of [
  "内衣",
  "一张图片只输出一条记录",
  "不要输出「图片」字段",
  "产品编号",
  "外箱容量",
  "客户意向价",
  "做货要求一",
  "箱    数",
  "做货要求二",
  "M010#",
  "1500*3.7",
  "均码",
]) {
  assert.ok(
    prompt.includes(requiredText),
    `neiyi prompt 应包含 ${requiredText}`
  );
}

const serverPrompts = readProjectFile("lib/serverPrompts.ts");
assert.match(
  serverPrompts,
  /export type PromptMode = "baihuo" \| "fushi" \| "neiyi" \| "custom";/,
  "PromptMode 联合类型应在 custom 前包含 neiyi"
);
assert.match(
  serverPrompts,
  /neiyi:\s*"neiyi\.md"/,
  "FILES 映射应加载 neiyi.md"
);

const promptInput = readProjectFile("components/PromptInput.tsx");
assert.match(
  promptInput,
  /export type Mode = "baihuo" \| "fushi" \| "neiyi" \| "custom";/,
  "前端 Mode 联合类型应在 custom 前包含 neiyi"
);
assert.match(
  promptInput,
  /neiyi:\s*"内衣"/,
  "PromptInput 标签应显示内衣"
);
assert.match(
  promptInput,
  /const ORDER: Mode\[\] = \["baihuo", "fushi", "neiyi", "custom"\];/,
  "PromptInput 排序应在自定义前显示内衣"
);

console.log("内衣模式静态检查通过");

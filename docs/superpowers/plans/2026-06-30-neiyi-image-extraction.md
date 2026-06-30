# Neiyi Image Extraction Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an independent built-in "内衣" extraction mode that converts one underwear product image into one Excel row with product number, carton capacity, target price, and size.

**Architecture:** Keep the existing prompt-driven extraction pipeline. Add a new `neiyi` mode to the front-end selector and server prompt loader, then create `lib/prompts/neiyi.md` with the new extraction rules. Use a small static regression test to protect the wiring and prompt requirements because the project currently has no test runner.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Markdown prompt files, Node.js static test, existing `/api/extract` and `/api/generate-excel` routes.

---

## Scope Check

The approved spec covers one focused subsystem: adding a new built-in extraction mode. It does not require a new API, database, account flow, storage layer, or Excel generator rewrite. This can be implemented as one plan.

## File Structure

- Create `tests/static/neiyi-mode.test.mjs`
  - Static regression test for mode wiring and prompt content.
- Modify `package.json`
  - Add `test:neiyi` script so the static regression test is easy to run.
- Create `lib/prompts/neiyi.md`
  - Prompt rules for one-image-one-row underwear extraction.
- Modify `lib/serverPrompts.ts`
  - Add `neiyi` to `PromptMode` and map it to `neiyi.md`.
- Modify `components/PromptInput.tsx`
  - Add the "内衣" button and make `neiyi` a valid front-end mode.
- Modify `app/page.tsx`
  - Update the short page subtitle so it includes size/capacity/price wording.
- Modify `app/layout.tsx`
  - Align metadata description with the expanded supported fields.

## Task 1: Add Static Regression Test

**Files:**
- Create: `tests/static/neiyi-mode.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create the static test file**

Create `tests/static/neiyi-mode.test.mjs` with this content:

```js
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readProjectFile(path) {
  return readFileSync(join(root, path), "utf8");
}

const promptPath = join(root, "lib/prompts/neiyi.md");
assert.ok(existsSync(promptPath), "neiyi prompt file should exist");

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
    `neiyi prompt should include ${requiredText}`
  );
}

const serverPrompts = readProjectFile("lib/serverPrompts.ts");
assert.match(
  serverPrompts,
  /export type PromptMode = "baihuo" \| "fushi" \| "neiyi" \| "custom";/,
  "PromptMode union should include neiyi before custom"
);
assert.match(
  serverPrompts,
  /neiyi:\s*"neiyi\.md"/,
  "FILES map should load neiyi.md"
);

const promptInput = readProjectFile("components/PromptInput.tsx");
assert.match(
  promptInput,
  /export type Mode = "baihuo" \| "fushi" \| "neiyi" \| "custom";/,
  "front-end Mode union should include neiyi before custom"
);
assert.match(
  promptInput,
  /neiyi:\s*"内衣"/,
  "PromptInput labels should show 内衣"
);
assert.match(
  promptInput,
  /const ORDER: Mode\[\] = \["baihuo", "fushi", "neiyi", "custom"\];/,
  "PromptInput order should expose 内衣 before custom"
);

console.log("neiyi mode static checks passed");
```

- [ ] **Step 2: Run the static test and verify it fails for the right reason**

Run:

```bash
node tests/static/neiyi-mode.test.mjs
```

Expected: FAIL with an assertion containing:

```text
neiyi prompt file should exist
```

- [ ] **Step 3: Add a package script for the static test**

In `package.json`, replace the current `scripts` block with:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test:neiyi": "node tests/static/neiyi-mode.test.mjs"
}
```

- [ ] **Step 4: Run the package script and verify the test still fails for missing prompt**

Run:

```bash
npm run test:neiyi
```

Expected: FAIL with an assertion containing:

```text
neiyi prompt file should exist
```

## Task 2: Add the 内衣 Prompt

**Files:**
- Create: `lib/prompts/neiyi.md`
- Test: `tests/static/neiyi-mode.test.mjs`

- [ ] **Step 1: Create the prompt file**

Create `lib/prompts/neiyi.md` with this content:

```markdown
# 内衣商品图片提取提示词

## 任务目标

从内衣商品图片中提取货号、外箱容量、客户意向价和尺码，按固定字段输出为 Excel 数据。每张图片只输出一条记录，即使图片中出现多个颜色、多个实物、多个吊牌或多个尺码贴牌。

图片列由系统自动嵌入，JSON 中不要输出「图片」字段。

## 输出字段

严格只输出以下 6 个字段，字段名必须完全一致：

| 字段 | 规则 |
| --- | --- |
| 产品编号 | 提取图片中末尾带 `#` 的货号，如 `M010#`。必须保留 `#`。 |
| 外箱容量 | 提取 `*`、`×`、`x`、`X` 前面的数字，如 `1500*3.7` 提取 `1500`。 |
| 客户意向价 | 提取 `*`、`×`、`x`、`X` 后面的数字，如 `1500*3.7` 提取 `3.7`。 |
| 做货要求一 | 提取尺码组合，如 `M L XL`。没有看到尺码时填 `均码`。 |
| 箱    数 | 始终输出空字符串。不要默认填 `1`。 |
| 做货要求二 | 始终输出空字符串。 |

## 图片版式

内衣图片通常是商品实拍图，上面叠加大号文字：

```text
货号  M010#
尺码  M L XL
装箱量，单价  1500*3.7
```

大号叠加文字的优先级高于吊牌上的小字。吊牌上可能写 `NO:M010`、`M`、`L`、`XL`，但如果图片右下角或底部覆盖文字写了 `M010#`，产品编号必须输出 `M010#`。

## 字段识别规则

### 1. 产品编号

- 优先提取大号覆盖文字中末尾带 `#` 的货号。
- 格式通常是字母加数字再加 `#`，例如 `M010#`、`A123#`、`K988#`。
- 保留原始字母、数字和 `#`。
- 如果只在吊牌中看到 `NO:M010`，没有看到覆盖文字中的 `M010#`，可输出 `M010#(?)`。
- 完全看不到货号时输出 `[待确认]`。

### 2. 做货要求一

- 提取尺码组合，放入「做货要求一」。
- 常见尺码包括 `S`、`M`、`L`、`XL`、`XXL`、`XXXL`、`2XL`、`3XL`。
- 多个尺码用空格分隔，保持图片原有顺序，例如 `M L XL`。
- 如果图片没有写尺码，输出 `均码`。
- 不要因为图片里出现多个吊牌尺码就拆多行。

### 3. 外箱容量和客户意向价

- 找到 `数字*数字`、`数字×数字`、`数字x数字`、`数字X数字` 结构。
- 乘号前的数字填「外箱容量」。
- 乘号后的数字填「客户意向价」。
- 示例：`1500*3.7` -> 外箱容量 `1500`，客户意向价 `3.7`。
- 小数点必须保留。
- 完全看不到该结构时，外箱容量和客户意向价输出 `[待确认]`。

### 4. 箱    数

- 始终输出空字符串。
- 不要根据图片数量、颜色数量、吊牌数量或外箱容量推导箱数。
- 不要默认填 `1`。

### 5. 做货要求二

- 始终输出空字符串。
- 本模式暂不提取颜色、花型、款式、包装等其他信息。

## 一图一行规则

一张图片只输出一条记录。不要因为以下情况输出多行：

- 图片里有多条内衣。
- 图片里有多个颜色。
- 图片里有多个吊牌。
- 图片里吊牌上出现 `M`、`L`、`XL` 等多个尺码。

## 输出示例

图片内容：

```text
货号 M010#
尺码 M L XL
装箱量，单价 1500*3.7
```

输出数据：

| 产品编号 | 外箱容量 | 客户意向价 | 做货要求一 | 箱    数 | 做货要求二 |
| --- | --- | --- | --- | --- | --- |
| M010# | 1500 | 3.7 | M L XL |  |  |

## 自检清单

- 产品编号是否保留了末尾 `#`？
- 是否优先使用了图片覆盖文字，而不是吊牌小字？
- 是否把 `*`、`×`、`x`、`X` 前面的数字放入「外箱容量」？
- 是否把 `*`、`×`、`x`、`X` 后面的数字放入「客户意向价」？
- 没有尺码时是否填了 `均码`？
- 「箱    数」是否为空？
- 「做货要求二」是否为空？
- 是否只输出一条记录？
- 是否没有输出「图片」字段？
```

- [ ] **Step 2: Run the static test and verify the next expected failure**

Run:

```bash
npm run test:neiyi
```

Expected: FAIL with an assertion containing:

```text
PromptMode union should include neiyi before custom
```

## Task 3: Wire Server Prompt Loading

**Files:**
- Modify: `lib/serverPrompts.ts`
- Test: `tests/static/neiyi-mode.test.mjs`

- [ ] **Step 1: Replace server prompt mode definitions**

Replace the full contents of `lib/serverPrompts.ts` with:

```ts
import { readFile } from "fs/promises";
import path from "path";

export type PromptMode = "baihuo" | "fushi" | "neiyi" | "custom";

const FILES: Record<Exclude<PromptMode, "custom">, string> = {
  baihuo: "baihuo.md",
  fushi: "fushi.md",
  neiyi: "neiyi.md",
};

const cache = new Map<string, string>();

export async function loadPrompt(
  mode: Exclude<PromptMode, "custom">
): Promise<string> {
  const cached = cache.get(mode);
  if (cached) return cached;
  const file = path.join(process.cwd(), "lib", "prompts", FILES[mode]);
  const text = await readFile(file, "utf8");
  cache.set(mode, text);
  return text;
}
```

- [ ] **Step 2: Run the static test and verify the front-end wiring failure**

Run:

```bash
npm run test:neiyi
```

Expected: FAIL with an assertion containing:

```text
front-end Mode union should include neiyi before custom
```

## Task 4: Wire Front-End Mode Selection

**Files:**
- Modify: `components/PromptInput.tsx`
- Test: `tests/static/neiyi-mode.test.mjs`

- [ ] **Step 1: Replace the mode declarations in `PromptInput`**

In `components/PromptInput.tsx`, replace lines 5-13 with:

```ts
export type Mode = "baihuo" | "fushi" | "neiyi" | "custom";

const LABELS: Record<Mode, string> = {
  baihuo: "百货",
  fushi: "服饰鞋帽",
  neiyi: "内衣",
  custom: "自定义",
};

const ORDER: Mode[] = ["baihuo", "fushi", "neiyi", "custom"];
```

- [ ] **Step 2: Run the static test and verify it passes**

Run:

```bash
npm run test:neiyi
```

Expected: PASS with:

```text
neiyi mode static checks passed
```

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS with no ESLint errors.

- [ ] **Step 4: Commit the tested mode wiring**

Run:

```bash
git add package.json tests/static/neiyi-mode.test.mjs lib/prompts/neiyi.md lib/serverPrompts.ts components/PromptInput.tsx
git commit -m "feat: add neiyi extraction mode"
```

Expected: commit succeeds.

## Task 5: Align User-Facing Copy

**Files:**
- Modify: `app/page.tsx:148-150`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update the homepage subtitle**

In `app/page.tsx`, replace the paragraph at lines 148-150 with:

```tsx
<p className="text-gray-500 mt-2">
  上传产品图片，AI 自动识别货号、容量、单价、尺码，一键生成 Excel 表格
</p>
```

- [ ] **Step 2: Update metadata description**

In `app/layout.tsx`, replace the `description` value with:

```ts
description: "上传产品图片，AI 自动识别货号、容量、单价、尺码，一键生成 Excel 表格",
```

- [ ] **Step 3: Run static test and lint**

Run:

```bash
npm run test:neiyi
npm run lint
```

Expected: both commands pass. `npm run test:neiyi` prints:

```text
neiyi mode static checks passed
```

- [ ] **Step 4: Commit the copy update**

Run:

```bash
git add app/page.tsx app/layout.tsx
git commit -m "chore: update image extraction copy"
```

Expected: commit succeeds.

## Task 6: Build and Manual Acceptance Check

**Files:**
- No required file changes.

- [ ] **Step 1: Run full local verification commands**

Run:

```bash
npm run test:neiyi
npm run lint
npm run build
```

Expected:

- `npm run test:neiyi` prints `neiyi mode static checks passed`.
- `npm run lint` exits with no ESLint errors.
- `npm run build` completes successfully.

- [ ] **Step 2: Start the dev server**

Run:

```bash
npm run dev
```

Expected: Next.js starts and prints a local URL, normally:

```text
http://localhost:3000
```

- [ ] **Step 3: Verify UI mode selection**

Open the local URL in a browser.

Expected:

- The mode selector shows four buttons: `百货`, `服饰鞋帽`, `内衣`, `自定义`.
- Clicking `内衣` highlights it.
- The helper text shows `当前使用「内衣」内置规则（由服务端维护，不可编辑）`.

- [ ] **Step 4: Verify sample extraction manually**

Use this sample image:

```text
/Users/wangxinlong/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_tdpdklyr44gz22_76a7/temp/RWTemp/2026-06/34619b952756fe00300de515919fb9a4.png
```

Select `内衣`, upload the image, and run extraction with a working API key or configured `CLAUDE_PROXY_KEY`.

Expected table result:

| 产品编号 | 外箱容量 | 客户意向价 | 做货要求一 | 箱    数 | 做货要求二 |
| --- | --- | --- | --- | --- | --- |
| M010# | 1500 | 3.7 | M L XL |  |  |

- [ ] **Step 5: Verify Excel export**

Click `下载 Excel`.

Expected:

- The file downloads as `product_list.xlsx`.
- The first column header remains `图片`.
- The generated row contains the embedded product image.
- The data columns include `产品编号`, `外箱容量`, `客户意向价`, `做货要求一`, `箱    数`, `做货要求二`.
- `箱    数` and `做货要求二` cells are blank for the sample row.

- [ ] **Step 6: Commit verification fixes if any were needed**

If manual verification required code or prompt fixes, run:

```bash
git add components/PromptInput.tsx lib/serverPrompts.ts lib/prompts/neiyi.md app/page.tsx app/layout.tsx tests/static/neiyi-mode.test.mjs package.json
git commit -m "fix: refine neiyi extraction verification"
```

Expected: commit succeeds only if files changed. If no files changed, skip this command.

## Plan Self-Review

- Spec coverage: the plan adds a standalone `neiyi` mode, preserves existing modes, preserves the Excel `图片` column, keeps one image to one row, leaves `箱    数` and `做货要求二` empty, and validates with the provided sample image.
- Completeness scan: this plan contains no undefined implementation gaps.
- Type consistency: `neiyi` is used consistently in the front-end `Mode`, server `PromptMode`, prompt filename, static test, and API payload path through existing `mode` state.

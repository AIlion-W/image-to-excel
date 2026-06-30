# 内衣图片提取模式实现计划

> **给执行代理：** 必须使用子技能 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 按任务逐项执行本计划。所有步骤都使用复选框（`- [ ]`）便于跟踪。

**目标：** 新增一个独立的内置「内衣」识别模式，把一张内衣商品图转换成一行 Excel 数据，字段包含产品编号、外箱容量、客户意向价和尺码。

**架构：** 沿用现有的 prompt-driven 图片识别链路。前端模式选择器和服务端 prompt loader 新增 `neiyi` 模式，再创建 `lib/prompts/neiyi.md` 保存内衣提取规则。项目当前没有测试框架，因此新增一个轻量静态回归测试，保护模式接线和 prompt 关键要求。

**技术栈：** Next.js 16 App Router、React 19、TypeScript、Markdown prompt 文件、Node.js 静态测试、现有 `/api/extract` 和 `/api/generate-excel` 路由。

---

## 范围检查

已确认的 spec 只覆盖一个聚焦子系统：新增一个内置识别模式。它不需要新增 API、数据库、账号流程、存储层，也不需要重写 Excel 生成器。可以作为一个完整实现计划执行。

## 文件结构

- 新建 `tests/static/neiyi-mode.test.mjs`
  - 静态回归测试，用于检查模式接线和 prompt 关键内容。
- 修改 `package.json`
  - 增加 `test:neiyi` 脚本，方便运行静态回归测试。
- 新建 `lib/prompts/neiyi.md`
  - 内衣图片「一图一行」提取规则。
- 修改 `lib/serverPrompts.ts`
  - 在 `PromptMode` 中加入 `neiyi`，并映射到 `neiyi.md`。
- 修改 `components/PromptInput.tsx`
  - 新增「内衣」按钮，并让 `neiyi` 成为合法前端模式。
- 修改 `app/page.tsx`
  - 更新首页副标题，让文案覆盖尺码、容量和单价。
- 修改 `app/layout.tsx`
  - 更新 metadata description，让它和新增字段范围一致。

## 任务 1：新增静态回归测试

**文件：**
- 新建：`tests/static/neiyi-mode.test.mjs`
- 修改：`package.json`

- [ ] **步骤 1：创建静态测试文件**

创建 `tests/static/neiyi-mode.test.mjs`，内容如下：

```js
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
```

- [ ] **步骤 2：运行静态测试，确认它以正确原因失败**

运行：

```bash
node tests/static/neiyi-mode.test.mjs
```

预期：失败，断言信息包含：

```text
应存在 neiyi prompt 文件
```

- [ ] **步骤 3：新增 package 测试脚本**

在 `package.json` 中，将当前 `scripts` 块替换为：

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test:neiyi": "node tests/static/neiyi-mode.test.mjs"
}
```

- [ ] **步骤 4：运行 package 脚本，确认仍因缺少 prompt 失败**

运行：

```bash
npm run test:neiyi
```

预期：失败，断言信息包含：

```text
应存在 neiyi prompt 文件
```

## 任务 2：新增「内衣」Prompt

**文件：**
- 新建：`lib/prompts/neiyi.md`
- 测试：`tests/static/neiyi-mode.test.mjs`

- [ ] **步骤 1：创建 prompt 文件**

创建 `lib/prompts/neiyi.md`，内容如下：

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

- [ ] **步骤 2：运行静态测试，确认进入下一个预期失败**

运行：

```bash
npm run test:neiyi
```

预期：失败，断言信息包含：

```text
PromptMode 联合类型应在 custom 前包含 neiyi
```

## 任务 3：接入服务端 Prompt 加载

**文件：**
- 修改：`lib/serverPrompts.ts`
- 测试：`tests/static/neiyi-mode.test.mjs`

- [ ] **步骤 1：替换服务端 prompt 模式定义**

将 `lib/serverPrompts.ts` 的完整内容替换为：

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

- [ ] **步骤 2：运行静态测试，确认进入前端接线失败**

运行：

```bash
npm run test:neiyi
```

预期：失败，断言信息包含：

```text
前端 Mode 联合类型应在 custom 前包含 neiyi
```

## 任务 4：接入前端模式选择

**文件：**
- 修改：`components/PromptInput.tsx`
- 测试：`tests/static/neiyi-mode.test.mjs`

- [ ] **步骤 1：替换 `PromptInput` 中的模式声明**

在 `components/PromptInput.tsx` 中，将第 5-13 行替换为：

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

- [ ] **步骤 2：运行静态测试，确认通过**

运行：

```bash
npm run test:neiyi
```

预期：通过并输出：

```text
内衣模式静态检查通过
```

- [ ] **步骤 3：运行 lint**

运行：

```bash
npm run lint
```

预期：通过，没有 ESLint 错误。

- [ ] **步骤 4：提交已测试的模式接线**

运行：

```bash
git add package.json tests/static/neiyi-mode.test.mjs lib/prompts/neiyi.md lib/serverPrompts.ts components/PromptInput.tsx
git commit -m "feat: add neiyi extraction mode"
```

预期：提交成功。

## 任务 5：对齐用户可见文案

**文件：**
- 修改：`app/page.tsx:148-150`
- 修改：`app/layout.tsx`

- [ ] **步骤 1：更新首页副标题**

在 `app/page.tsx` 中，将第 148-150 行的段落替换为：

```tsx
<p className="text-gray-500 mt-2">
  上传产品图片，AI 自动识别货号、容量、单价、尺码，一键生成 Excel 表格
</p>
```

- [ ] **步骤 2：更新 metadata description**

在 `app/layout.tsx` 中，将 `description` 的值替换为：

```ts
description: "上传产品图片，AI 自动识别货号、容量、单价、尺码，一键生成 Excel 表格",
```

- [ ] **步骤 3：运行静态测试和 lint**

运行：

```bash
npm run test:neiyi
npm run lint
```

预期：两个命令都通过。`npm run test:neiyi` 输出：

```text
内衣模式静态检查通过
```

- [ ] **步骤 4：提交文案更新**

运行：

```bash
git add app/page.tsx app/layout.tsx
git commit -m "chore: update image extraction copy"
```

预期：提交成功。

## 任务 6：构建与人工验收

**文件：**
- 不需要改文件。

- [ ] **步骤 1：运行完整本地验证命令**

运行：

```bash
npm run test:neiyi
npm run lint
npm run build
```

预期：

- `npm run test:neiyi` 输出 `内衣模式静态检查通过`。
- `npm run lint` 没有 ESLint 错误。
- `npm run build` 成功完成。

- [ ] **步骤 2：启动开发服务器**

运行：

```bash
npm run dev
```

预期：Next.js 启动并输出本地 URL，通常是：

```text
http://localhost:3000
```

- [ ] **步骤 3：验证 UI 模式选择**

在浏览器打开本地 URL。

预期：

- 模式选择器显示四个按钮：`百货`、`服饰鞋帽`、`内衣`、`自定义`。
- 点击 `内衣` 后，该按钮高亮。
- 辅助文字显示 `当前使用「内衣」内置规则（由服务端维护，不可编辑）`。

- [ ] **步骤 4：用样例图片人工验证提取结果**

使用这张样例图片：

```text
/Users/wangxinlong/Library/Containers/com.tencent.xinWeChat/Data/Documents/xwechat_files/wxid_tdpdklyr44gz22_76a7/temp/RWTemp/2026-06/34619b952756fe00300de515919fb9a4.png
```

选择 `内衣`，上传图片，并在有可用 API Key 或已配置 `CLAUDE_PROXY_KEY` 的情况下开始识别。

预期表格结果：

| 产品编号 | 外箱容量 | 客户意向价 | 做货要求一 | 箱    数 | 做货要求二 |
| --- | --- | --- | --- | --- | --- |
| M010# | 1500 | 3.7 | M L XL |  |  |

- [ ] **步骤 5：验证 Excel 导出**

点击 `下载 Excel`。

预期：

- 文件下载为 `product_list.xlsx`。
- 第一列表头仍是「图片」。
- 生成行包含嵌入的产品图片。
- 数据列包含 `产品编号`、`外箱容量`、`客户意向价`、`做货要求一`、`箱    数`、`做货要求二`。
- 样例行的 `箱    数` 和 `做货要求二` 为空。

- [ ] **步骤 6：如验证中需要修复，提交修复**

如果人工验证过程中改了代码或 prompt，运行：

```bash
git add components/PromptInput.tsx lib/serverPrompts.ts lib/prompts/neiyi.md app/page.tsx app/layout.tsx tests/static/neiyi-mode.test.mjs package.json
git commit -m "fix: refine neiyi extraction verification"
```

预期：只有在确实有文件变更时才提交成功。如果没有文件变更，跳过这个命令。

## 计划自检

- Spec 覆盖：本计划新增独立 `neiyi` 模式，保留现有模式，保留 Excel 的「图片」列，坚持一图一行，让 `箱    数` 和 `做货要求二` 为空，并用用户提供的样例图片验收。
- 完整性扫描：本计划没有未定义的实现缺口。
- 类型一致性：`neiyi` 在前端 `Mode`、服务端 `PromptMode`、prompt 文件名、静态测试和现有 API payload 的 `mode` 状态中保持一致。

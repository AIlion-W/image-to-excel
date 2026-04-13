export interface ExtractionResult {
  items: Record<string, string>[];
  raw?: string;
}

const DEFAULT_PROMPT = `请从图片中提取以下信息：
1. 产品编号 - 通常是"几杠几"格式（如 2-8、3-6），提取原始编号
2. 外箱容量 - 提取 PCS/pcs 前面的数字，只要数字
3. 客户意向价 - 提取人民币符号（¥ 或 ￥）前面的数字，只要数字。【易错提醒】手写价格中小数点可能很小或模糊，务必仔细辨认。如果数字之间有小圆点或略微分隔，那就是小数点，必须保留（例如 14.5 不能写成 145，3.5 不能写成 35）。外贸产品单价通常在几元到几十元之间，如果识别结果超过 100，请重新检查是否遗漏了小数点
4. 做货要求一 - 尺寸规格。如果是面积（两个数字），格式为"X×X"（如 15.5×20.5）；如果是体积（三个数字），格式为"X×X×X"（如 24×28×29）。按图片实际内容判断是两个还是三个数字，原样提取
5. 箱数 - 提取"件"字前面的数字，只要数字。【易错提醒】先找到"件"字，然后读取"件"字紧前面的数字。注意：手写的"件"字容易被误认成数字"4"，导致箱数多出一个"4"。例如"1件"可能被误读为"14"，"2件"被误读为"24"——如果你识别的数字末尾是 4 且紧挨着像"件"的笔画，那个 4 很可能就是"件"字本身，应去掉
6. 做货要求二 - 图片中除了以上信息之外的所有其他信息（如颜色、款式、图案数、包装方式、厚度等），全部归入此字段`;

function buildPrompt(userPrompt: string): string {
  return `你是一个图片信息提取专家。

${userPrompt}

注意事项：
- 手写字体可能不规范，需结合上下文推断
- 这是产品/外贸场景，常见词汇包括：图案、款式、颜色、尺寸、opp袋、烫金、开天窗等。如果识别出"国家"等不符合产品场景的词，很可能是"图案"的误读
- 如果某个字段无法识别，标记为 [待确认]
- 一张图片可能包含多个产品信息，请全部提取

请严格按以下 JSON 格式返回，不要添加其他文字：
{
  "items": [
    {"字段1": "值1", "字段2": "值2", ...},
    ...
  ]
}

其中字段名称从上面的提取规则中获取。`;
}

function isOpenAIModel(model: string): boolean {
  return model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4");
}

async function callOpenAI(
  imageBase64: string,
  mediaType: string,
  apiKey: string,
  baseURL: string,
  model: string,
  prompt: string
): Promise<string> {
  const res = await fetch(`${baseURL}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mediaType};base64,${imageBase64}`,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callClaude(
  imageBase64: string,
  mediaType: string,
  apiKey: string,
  baseURL: string,
  model: string,
  prompt: string
): Promise<string> {
  const res = await fetch(`${baseURL}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }

  const data = await res.json();
  return data.content?.[0]?.type === "text" ? data.content[0].text : "";
}

export async function extractFromImage(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp",
  apiKey: string,
  baseURL?: string,
  model?: string,
  customPrompt?: string
): Promise<ExtractionResult> {
  const url = baseURL || "https://api.anthropic.com";
  const mdl = model || "claude-sonnet-4-20250514";
  const prompt = buildPrompt(customPrompt || DEFAULT_PROMPT);

  const text = isOpenAIModel(mdl)
    ? await callOpenAI(imageBase64, mediaType, apiKey, url, mdl, prompt)
    : await callClaude(imageBase64, mediaType, apiKey, url, mdl, prompt);

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { items: parsed.items || [], raw: text };
    }
  } catch {
    // fallback
  }

  return { items: [], raw: text };
}

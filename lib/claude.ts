export interface ExtractionResult {
  items: Record<string, string>[];
  raw?: string;
}

const DEFAULT_PROMPT = `请从图片中提取以下信息：
1. 产品编号 - 通常是"几杠几"格式（如 2-8、3-6），提取原始编号
2. 外箱容量 - 提取 PCS/pcs 前面的数字，只要数字
3. 客户意向价 - 提取人民币符号（¥ 或 ￥）前面的数字，只要数字。【易错提醒】手写价格中小数点可能很小或模糊，务必仔细辨认。如果数字之间有小圆点或略微分隔，那就是小数点，必须保留（例如 14.5 不能写成 145，3.5 不能写成 35）。外贸产品单价通常在几元到几十元之间，如果识别结果超过 100，请重新检查是否遗漏了小数点
4. 做货要求一 - 所有尺寸/规格相关的信息（如 7×9、15.5×20.5、7cm 等）。可能包含多组尺寸，用逗号分隔。【重要】如果图片中完全没有尺寸信息，此字段就留空，不要填入其他数据
5. 箱数 - 【必须看到"件"字才提取】在图片中找到"件"字，然后提取"件"字前面的完整数字，原样提取，不限位数（2、32、500、1200 都有可能）。如果图片中找不到"件"字，标记为 [待确认]，不要猜测。【易错提醒】手写数字可能连笔，仔细辨认每一位数字。手写"件"字的单人旁"亻"容易被误认成数字"4"，只在末尾的"4"明显是"件"字笔画时才去掉
6. 做货要求二 - 提取完产品编号、外箱容量、客户意向价、做货要求一、箱数之后，图片中剩余的所有其他信息全部归入此字段（如颜色、款式、图案数、包装方式、厚度、版费、杯型等）。不要遗漏任何信息。【易错提醒】这是产品做货场景，手写内容都是工厂常用术语，请用以下常见词汇表来纠正识别结果：
   - "字母""字母图案" → 不要误读为"蝴""蝴蝶"等
   - "不要""不要XX" → 不要误读为"硬""硬件"等，手写"不"字容易看成"硬"
   - "颜色""颜色亮""颜色深" → 不要误读为"瓷""瓷亮"等，手写"颜色"二字容易被误认
   - "图案""组图案" → 不要误读为"国案""国家"等
   - 常见做货术语包括：单色、双色、渐变色、不要渐变色、字母、数字、图案、颜色亮、颜色深、白芯、白盒、opp袋、烫金、开天窗、磨砂、亮膜、哑膜、对裱、过胶
   - 如果识别出的词不在上述常见术语中且看起来不通顺，请尝试用最接近的常见术语替换`;

function buildPrompt(userPrompt: string): string {
  return `你是一个图片信息提取专家。

${userPrompt}

注意事项：
- 手写字体可能不规范，需结合上下文推断
- 这是产品/外贸场景，常见词汇包括：图案、款式、颜色、尺寸、opp袋、烫金、开天窗等。如果识别出"国家"等不符合产品场景的词，很可能是"图案"的误读
- 如果某个字段无法识别，标记为 [待确认]
- 一张图片可能包含多个产品信息，请全部提取
- 箱数字段注意：手写"件"字的单人旁"亻"容易被误认成"4"，但箱数本身可以是任意数字（个位或两位数都有可能），不要强制截断。只在末尾的"4"明显是"件"字笔画时才去掉

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

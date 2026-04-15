export interface ExtractionResult {
  items: Record<string, string>[];
  raw?: string;
}

const DEFAULT_PROMPT = `请从图片中提取以下信息。

【最高优先级】标准图片格式（大多数图片都遵循这个格式，按照这个格式提取出错概率最小）：
上方：产品编号（X-X 格式）
下方一行：X件 × X PCS × X¥
这一行包含了4个必填的核心数据，优先按这个格式对应提取。

具体规则如下：
1. 产品编号 - 图片上方，"几杠几"格式（如 2-8、3-6、6-15），提取原始编号
2. 外箱容量 - 从"X PCS"中提取 PCS 前面的数字，只要数字
3. 客户意向价 - 【必填字段】标准格式下方一行最后是"X¥"，这个字段一定存在。从符号前面提取数字，小数点务必保留。【强制纠错规则】手写价格中小数点可能很小、很淡、或被两个数字连笔掩盖，必须逐位仔细辨认。特别注意：如果识别出的数字是两位数（如39、55、510），而且看起来偏大，很可能漏了小数点。常见误读：3.9→39、5.5→55、10.5→105。遇到这种情况要反思是否在两位数中间漏了小数点。外贸产品单价通常不超过20¥，如果识别超过50的数字，必须检查是否漏了小数点
4. 做货要求一 - 只填尺寸/规格相关的纯数字信息（7×9、15.5×20.5、7cm 等）。【强制规则】"X付""X组"等非尺寸词汇不要放这里。如果完全没有纯数字尺寸信息，此字段留空
5. 箱数 - 【必填字段】用"件"字来表示箱数。
   【强制读取顺序——必须严格按以下三步执行，禁止整体读取数字】
   第一步（定位"件"字）：在图片中找到"件"字的位置。手写"件"字由单人旁"亻"和右侧笔画组成，共4个笔画。"件"字可能被误认成数字"4"或"-14"等，但它不是数字，它是一个汉字。
   第二步（刨掉"件"字）：找到"件"字后，在脑中把"件"字完全擦掉、删除，当它不存在。
   第三步（读取前面的数字）：现在才去看"件"字前面剩下的数字是什么，这个数字就是箱数。
   【禁止事项】绝对不能先把一串数字整体读出来再判断，那样会把"件"字的笔画混进数字里（如50件→504）。必须先定位"件"、刨掉"件"、再读数字。
   【箱数 vs 款数区分】"X件"前面的数字是箱数，"X款"前面的数字是款数。"款"不等于"件"，"10款"应放到做货要求里，不是箱数。只有"件"字前面的数字才是箱数。
6. 做货要求二 - 图片中除了上述5个字段外的所有其他信息全部放这里（如2付、白芯、颜色、款式、版费等）。不要遗漏任何信息。
   【颜色+数量格式】如果看到文字下面直接跟着数字（如"古锡"下面写"30"），表示该颜色要多少个数量，输出时写成"古锡30"这样数字跟在颜色后面。常见颜色名：古锡、古青、古铜、古银、古金等。
   【"个"字误读纠错】手写"个"字容易被误认成"付"，在数量语境下（如"30个"）不要写成"30付"，除非图片中明确写的是"付"。
   【易错提醒】这是产品做货场景，手写内容都是工厂常用术语，请用以下常见词汇表来纠正识别结果：
   - "字母""字母图案" → 不要误读为"蝴""蝴蝶"等
   - "不要""不要XX" → 不要误读为"硬""硬件"等，手写"不"字容易看成"硬"
   - "颜色""颜色亮""颜色深" → 不要误读为"瓷""瓷亮"等，手写"颜色"二字容易被误认
   - "图案""组图案" → 不要误读为"国案""国家"等
   - "如图" → 不要误读为"超圆""起圆"等不通顺的词，这是很常见的标注用语
   - 常见做货术语包括：如图、单色、双色、渐变色、不要渐变色、字母、数字、图案、颜色亮、颜色深、白芯、白盒、opp袋、烫金、开天窗、磨砂、亮膜、哑膜、对裱、过胶
   - 如果识别出的词不在上述常见术语中且看起来不通顺，请尝试用最接近的常见术语替换
   【数字辨认】手写的6、8、3笔画相似容易混淆。5.8不要识别成5.6，5.3不要识别成5.8。遇到这三个数字时逐笔画核对：8是两个圈、6是上开口下封闭、3是两个弧向右开口`;

function buildPrompt(userPrompt: string): string {
  return `你是一个图片信息提取专家。

${userPrompt}

注意事项：
- 手写字体可能不规范，需结合上下文推断
- 这是产品/外贸场景，常见词汇包括：如图、图案、款式、颜色、尺寸、opp袋、烫金、开天窗等。如果识别出"国家""超圆"等不符合产品场景的词，很可能是"图案""如图"的误读
- 如果某个字段无法识别，标记为 [待确认]
- 一张图片可能包含多个产品信息，请全部提取
- 箱数字段注意：必须先定位"件"字→刨掉"件"字→再读前面的数字。绝对不能整体读取数字串，否则"件"字笔画会被混进数字（如50件→504）。"X款"是款数不是箱数，应放做货要求
- 数字辨认：手写6、8、3容易混淆，逐笔画核对。"个"字容易误认成"付"
- 颜色+数量：文字下面直接跟数字表示该颜色的数量，输出时数字跟在颜色名后面（如"古锡30"）

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

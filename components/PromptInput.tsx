"use client";

import { useState, useEffect } from "react";

const DEFAULT_PROMPT = `请从图片中提取以下信息。

【最高优先级】标准图片格式（大多数图片都遵循这个格式，按照这个格式提取出错概率最小）：
上方：产品编号（X-X 格式）
下方一行：X件 × X PCS × X人民币符号
这一行包含了4个必填的核心数据，优先按这个格式对应提取。

具体规则如下：
1. 产品编号 - 图片上方，"几杠几"格式（如 2-8、3-6、6-15），提取原始编号
2. 外箱容量 - 从"X PCS"中提取 PCS 前面的数字，只要数字
3. 客户意向价 - 从"X人民币符号"中提取符号前面的数字。【易错提醒】小数点务必保留（5.5不能写成55）。单价通常几元到几十元，超过100很可能漏了小数点
4. 做货要求一 - 只填尺寸/规格相关的纯数字信息（7×9、15.5×20.5、7cm 等）。【强制规则】"X付""X组"等非尺寸词汇不要放这里。如果完全没有纯数字尺寸信息，此字段留空
5. 箱数 - 从下方一行找到"X件"的"件"字，提取前面的完整数字。【强制规则】必须看到"件"字才能提取，不见"件"字就标[待确认]，宁可标[待确认]也不要乱猜。手写数字连笔要仔细，"件"的单人旁"亻"容易误读成"4"，末尾是4要检查是否真的是"件"字
6. 做货要求二 - 图片中除了上述5个字段外的所有其他信息全部放这里（如2付、白芯、颜色、款式、版费等）。不要遗漏任何信息。【易错提醒】这是产品做货场景，手写内容都是工厂常用术语，请用以下常见词汇表来纠正识别结果：
   - "字母""字母图案" → 不要误读为"蝴""蝴蝶"等
   - "不要""不要XX" → 不要误读为"硬""硬件"等，手写"不"字容易看成"硬"
   - "颜色""颜色亮""颜色深" → 不要误读为"瓷""瓷亮"等，手写"颜色"二字容易被误认
   - "图案""组图案" → 不要误读为"国案""国家"等
   - 常见做货术语包括：单色、双色、渐变色、不要渐变色、字母、数字、图案、颜色亮、颜色深、白芯、白盒、opp袋、烫金、开天窗、磨砂、亮膜、哑膜、对裱、过胶
   - 如果识别出的词不在上述常见术语中且看起来不通顺，请尝试用最接近的常见术语替换`;

interface Props {
  onPromptChange: (prompt: string) => void;
}

export default function PromptInput({ onPromptChange }: Props) {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("custom_prompt");
    if (saved) {
      setPrompt(saved);
      onPromptChange(saved);
    } else {
      onPromptChange(DEFAULT_PROMPT);
    }
  }, [onPromptChange]);

  const handleChange = (val: string) => {
    setPrompt(val);
    localStorage.setItem("custom_prompt", val);
    onPromptChange(val);
  };

  const handleReset = () => {
    handleChange(DEFAULT_PROMPT);
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <span className={`transition-transform ${collapsed ? "" : "rotate-90"}`}>
          ▶
        </span>
        自定义提取规则
        <span className="text-gray-400 font-normal">（定义要提取的字段和表头）</span>
      </button>

      {!collapsed && (
        <div className="space-y-2">
          <textarea
            value={prompt}
            onChange={(e) => handleChange(e.target.value)}
            rows={6}
            placeholder="描述你要从图片中提取哪些字段..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-400">
              描述要提取的字段名称和识别规则，AI 会按此生成表头和数据
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              恢复默认
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

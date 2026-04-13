"use client";

import { useState, useEffect } from "react";

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

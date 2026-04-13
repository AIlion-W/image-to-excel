"use client";

import { useState, useEffect } from "react";

const DEFAULT_PROMPT = `请从图片中提取以下信息：
1. 产品编号 - 通常是"几杠几"格式（如 2-8、3-6），提取原始编号
2. 外箱容量 - 提取 PCS/pcs 前面的数字，只要数字
3. 客户意向价 - 提取人民币符号（¥ 或 ￥）前面的数字，只要数字
4. 做货要求一 - 尺寸规格，格式为"X×X"（如 15.5×20.5），只提取尺寸
5. 箱数 - 提取"件"字前面的数字，只要数字
6. 做货要求二 - 图片中除了以上信息之外的所有其他信息（如颜色、款式、图案数、包装方式、厚度等），全部归入此字段`;

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

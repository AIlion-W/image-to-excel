"use client";

import { useState, useEffect } from "react";

const DEFAULT_PROMPT = `请从图片中提取以下信息：
1. 货号 - 产品编号，通常是 X-X 格式
2. 内装 - 每箱内装数量，只提取数字
3. 单价 - 单价（元），只提取数字
4. 尺寸 - 产品尺寸，X × X 格式`;

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

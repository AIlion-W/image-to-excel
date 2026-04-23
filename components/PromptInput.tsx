"use client";

import { useState, useEffect, useRef } from "react";

export type Mode = "baihuo" | "fushi" | "custom";

const LABELS: Record<Mode, string> = {
  baihuo: "百货",
  fushi: "服饰鞋帽",
  custom: "自定义",
};

const ORDER: Mode[] = ["baihuo", "fushi", "custom"];

const STORAGE = {
  mode: "prompt_mode",
  custom: "prompt_text_custom",
} as const;

interface Props {
  onChange: (state: { mode: Mode; customPrompt: string }) => void;
}

export default function PromptInput({ onChange }: Props) {
  const [mode, setMode] = useState<Mode>("baihuo");
  const [customPrompt, setCustomPrompt] = useState("");
  const [collapsed, setCollapsed] = useState(true);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const savedMode = (localStorage.getItem(STORAGE.mode) as Mode) || "baihuo";
    const savedCustom = localStorage.getItem(STORAGE.custom) ?? "";
    setMode(savedMode);
    setCustomPrompt(savedCustom);
    onChangeRef.current({ mode: savedMode, customPrompt: savedCustom });
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    localStorage.setItem(STORAGE.mode, m);
    onChangeRef.current({ mode: m, customPrompt });
  };

  const handleCustomChange = (val: string) => {
    setCustomPrompt(val);
    localStorage.setItem(STORAGE.custom, val);
    onChangeRef.current({ mode, customPrompt: val });
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {ORDER.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => switchMode(m)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              mode === m
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {LABELS[m]}
          </button>
        ))}
      </div>

      {mode === "custom" ? (
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
            <span className="text-gray-400 font-normal">
              （点击{collapsed ? "展开" : "收起"}编辑）
            </span>
          </button>
          {!collapsed && (
            <div className="space-y-2">
              <textarea
                value={customPrompt}
                onChange={(e) => handleCustomChange(e.target.value)}
                rows={10}
                placeholder="在此输入你自己的提取规则，AI 会按此生成表头和数据..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              />
              <p className="text-xs text-gray-400">
                自定义模式：改动会自动保存
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400">
          当前使用「{LABELS[mode]}」内置规则（由服务端维护，不可编辑）
        </p>
      )}
    </div>
  );
}

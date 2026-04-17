"use client";

import { useState, useEffect, useRef } from "react";

type Mode = "baihuo" | "fushi" | "custom";

const LABELS: Record<Mode, string> = {
  baihuo: "百货",
  fushi: "服饰鞋帽",
  custom: "自定义",
};

const ORDER: Mode[] = ["baihuo", "fushi", "custom"];

const PROMPT_URLS: Record<Exclude<Mode, "custom">, string> = {
  baihuo: "/prompts/baihuo.md",
  fushi: "/prompts/fushi.md",
};

const STORAGE = {
  mode: "prompt_mode",
  text: (m: Mode) => `prompt_text_${m}`,
} as const;

interface Props {
  onPromptChange: (prompt: string) => void;
}

export default function PromptInput({ onPromptChange }: Props) {
  const [mode, setMode] = useState<Mode>("baihuo");
  const [prompts, setPrompts] = useState<Record<Mode, string>>({
    baihuo: "",
    fushi: "",
    custom: "",
  });
  const [collapsed, setCollapsed] = useState(true);
  const defaultsRef = useRef<Record<Exclude<Mode, "custom">, string>>({
    baihuo: "",
    fushi: "",
  });
  const onPromptChangeRef = useRef(onPromptChange);

  useEffect(() => {
    onPromptChangeRef.current = onPromptChange;
  }, [onPromptChange]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [baihuoDefault, fushiDefault] = await Promise.all(
        (Object.keys(PROMPT_URLS) as Array<Exclude<Mode, "custom">>).map(
          async (m) => {
            const res = await fetch(PROMPT_URLS[m]);
            return res.ok ? await res.text() : "";
          },
        ),
      );
      if (cancelled) return;

      defaultsRef.current = { baihuo: baihuoDefault, fushi: fushiDefault };

      const savedMode = (localStorage.getItem(STORAGE.mode) as Mode) || "baihuo";
      const next: Record<Mode, string> = {
        baihuo: localStorage.getItem(STORAGE.text("baihuo")) ?? baihuoDefault,
        fushi: localStorage.getItem(STORAGE.text("fushi")) ?? fushiDefault,
        custom: localStorage.getItem(STORAGE.text("custom")) ?? "",
      };
      setPrompts(next);
      setMode(savedMode);
      onPromptChangeRef.current(next[savedMode]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const switchMode = (m: Mode) => {
    setMode(m);
    localStorage.setItem(STORAGE.mode, m);
    onPromptChangeRef.current(prompts[m]);
  };

  const handleChange = (val: string) => {
    setPrompts((prev) => ({ ...prev, [mode]: val }));
    localStorage.setItem(STORAGE.text(mode), val);
    onPromptChangeRef.current(val);
  };

  const handleReset = () => {
    if (mode === "custom") return;
    handleChange(defaultsRef.current[mode]);
  };

  const canReset = mode !== "custom";

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
        提取规则
        <span className="text-gray-400 font-normal">
          （当前：{LABELS[mode]}）
        </span>
      </button>

      {!collapsed && (
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

          <textarea
            value={prompts[mode]}
            onChange={(e) => handleChange(e.target.value)}
            rows={10}
            placeholder={
              mode === "custom"
                ? "在此输入你自己的提取规则，AI 会按此生成表头和数据..."
                : "描述你要从图片中提取哪些字段..."
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-400">
              {mode === "custom"
                ? "自定义模式：无内置模板，改动会自动保存"
                : "可修改此模板，改动会自动保存；恢复默认会覆盖当前模板"}
            </p>
            <button
              type="button"
              onClick={handleReset}
              disabled={!canReset}
              className="text-xs text-blue-500 hover:text-blue-700 disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              恢复默认
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

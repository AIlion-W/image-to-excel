"use client";

import { useState, useEffect } from "react";

interface Props {
  onKeyChange: (key: string) => void;
}

export default function ApiKeyInput({ onKeyChange }: Props) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("anthropic_api_key") || "";
    setKey(saved);
    onKeyChange(saved);
  }, [onKeyChange]);

  const handleChange = (val: string) => {
    setKey(val);
    localStorage.setItem("anthropic_api_key", val);
    onKeyChange(val);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Anthropic API Key
        <span className="text-gray-400 font-normal ml-2">（可选，留空则使用系统默认 Key）</span>
      </label>
      <div className="flex gap-2">
        <input
          type={show ? "text" : "password"}
          value={key}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="sk-ant-..."
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {show ? "隐藏" : "显示"}
        </button>
      </div>
    </div>
  );
}

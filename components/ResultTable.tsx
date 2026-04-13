"use client";

import { useState, useEffect, useRef } from "react";

interface ExtractedItem {
  货号: string;
  内装: string;
  单价: string;
  尺寸: string;
  _fileName?: string;
}

interface Props {
  data: ExtractedItem[];
  onDataChange: (data: ExtractedItem[]) => void;
  autoFollowLatest?: boolean;
}

const FIELDS = ["货号", "内装", "单价", "尺寸"] as const;
const PAGE_SIZE = 10;

export default function ResultTable({ data, onDataChange, autoFollowLatest }: Props) {
  const [page, setPage] = useState(0);
  const prevLength = useRef(data.length);

  // 识别过程中，新数据进来时自动跳到最后一页
  useEffect(() => {
    if (autoFollowLatest && data.length > prevLength.current) {
      const lastPage = Math.max(0, Math.ceil(data.length / PAGE_SIZE) - 1);
      setPage(lastPage);
    }
    prevLength.current = data.length;
  }, [data.length, autoFollowLatest]);

  if (data.length === 0) return null;

  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const pageData = data.slice(start, start + PAGE_SIZE);

  const handleCellEdit = (
    localIndex: number,
    field: string,
    value: string
  ) => {
    const globalIndex = start + localIndex;
    const updated = [...data];
    updated[globalIndex] = { ...updated[globalIndex], [field]: value };
    onDataChange(updated);
  };

  const removeRow = (localIndex: number) => {
    const globalIndex = start + localIndex;
    const updated = data.filter((_, i) => i !== globalIndex);
    onDataChange(updated);
    // 如果当前页没数据了，回到上一页
    if (start >= updated.length && page > 0) {
      setPage(page - 1);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-800">
          识别结果（{data.length} 条）
        </h3>
        <p className="text-xs text-gray-400">点击单元格可编辑修正</p>
      </div>
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="px-4 py-2 text-left">#</th>
              {FIELDS.map((f) => (
                <th key={f} className="px-4 py-2 text-center">
                  {f}
                </th>
              ))}
              <th className="px-4 py-2 text-center">来源</th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr
                key={start + i}
                className="border-t hover:bg-gray-50"
              >
                <td className="px-4 py-2 text-gray-400">{start + i + 1}</td>
                {FIELDS.map((field) => (
                  <td key={field} className="px-2 py-1">
                    <input
                      type="text"
                      value={(row as unknown as Record<string, string>)[field] || ""}
                      onChange={(e) =>
                        handleCellEdit(i, field, e.target.value)
                      }
                      className={`w-full px-2 py-1 text-center border border-transparent rounded hover:border-gray-300 focus:border-blue-500 focus:outline-none ${
                        (row as unknown as Record<string, string>)[field] === "[待确认]"
                          ? "text-orange-500 bg-orange-50"
                          : ""
                      }`}
                    />
                  </td>
                ))}
                <td className="px-4 py-2 text-xs text-gray-400 truncate max-w-[120px]">
                  {row._fileName}
                </td>
                <td className="px-2 py-2">
                  <button
                    onClick={() => removeRow(i)}
                    className="text-red-400 hover:text-red-600"
                  >
                    x
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
            className="px-3 py-1 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50"
          >
            上一页
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-8 h-8 text-sm rounded-lg ${
                i === page
                  ? "bg-blue-600 text-white"
                  : "border hover:bg-gray-50"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages - 1}
            className="px-3 py-1 text-sm border rounded-lg disabled:opacity-30 hover:bg-gray-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

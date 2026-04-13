"use client";

interface Props {
  data: Record<string, string>[];
  onDataChange: (data: Record<string, string>[]) => void;
}

export default function ResultTable({ data, onDataChange }: Props) {
  if (data.length === 0) return null;

  // 从数据动态获取字段名，排除内部字段
  const fields = Object.keys(data[0]).filter((k) => !k.startsWith("_"));

  const handleCellEdit = (
    rowIndex: number,
    field: string,
    value: string
  ) => {
    const updated = [...data];
    updated[rowIndex] = { ...updated[rowIndex], [field]: value };
    onDataChange(updated);
  };

  const removeRow = (index: number) => {
    onDataChange(data.filter((_, i) => i !== index));
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
              {fields.map((f) => (
                <th key={f} className="px-4 py-2 text-center">
                  {f}
                </th>
              ))}
              <th className="px-4 py-2 text-center">来源</th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                className="border-t hover:bg-gray-50"
              >
                <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                {fields.map((field) => (
                  <td key={field} className="px-2 py-1">
                    <input
                      type="text"
                      value={row[field] || ""}
                      onChange={(e) =>
                        handleCellEdit(i, field, e.target.value)
                      }
                      className={`w-full px-2 py-1 text-center border border-transparent rounded hover:border-gray-300 focus:border-blue-500 focus:outline-none ${
                        row[field] === "[待确认]"
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
    </div>
  );
}

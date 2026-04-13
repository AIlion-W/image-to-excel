"use client";

import { useState, useCallback } from "react";
import ApiKeyInput from "@/components/ApiKeyInput";
import ImageUploader, { UploadedImage } from "@/components/ImageUploader";
import ResultTable from "@/components/ResultTable";

interface ExtractedItem {
  货号: string;
  内装: string;
  单价: string;
  尺寸: string;
  _fileName?: string;
}

export default function Home() {
  const [apiKey, setApiKey] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [results, setResults] = useState<ExtractedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"upload" | "result">("upload");

  const handleKeyChange = useCallback((key: string) => {
    setApiKey(key);
  }, []);

  const handleExtract = async () => {
    if (images.length === 0) {
      setError("请先上传图片");
      return;
    }
    setLoading(true);
    setError("");
    setResults([]);
    setStep("result");
    setProgress({ current: 0, total: images.length });

    const allResults: ExtractedItem[] = [];
    let failCount = 0;

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      setProgress({ current: i + 1, total: images.length });

      try {
        const res = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            images: [
              {
                base64: img.base64,
                mediaType: img.mediaType,
                fileName: img.file.name,
              },
            ],
            apiKey: apiKey || undefined,
          }),
        });

        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          failCount++;
          continue;
        }
        if (!res.ok) {
          failCount++;
          continue;
        }

        for (const item of data.data) {
          allResults.push(item);
        }
        setResults([...allResults]);
      } catch {
        failCount++;
      }
    }

    if (failCount > 0 && allResults.length > 0) {
      setError(`${failCount} 张图片识别失败，其余 ${allResults.length} 条已完成`);
    } else if (allResults.length === 0) {
      setError("全部识别失败，请检查网络或稍后重试");
      setStep("upload");
    }

    setLoading(false);
  };

  const handleDownload = async () => {
    if (results.length === 0) return;
    setDownloading(true);
    setError("");

    try {
      const rows = results.map((item) => {
        const img = images.find((i) => i.file.name === item._fileName);
        return {
          ...item,
          imageBase64: img?.base64,
          imageMediaType: img?.mediaType,
        };
      });

      const res = await fetch("/api/generate-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "product_list.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "下载失败，请重试");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            产品图片 → Excel
          </h1>
          <p className="text-gray-500 mt-2">
            上传产品图片，AI 自动识别货号/内装/单价/尺寸，一键生成 Excel 表格
          </p>
        </div>

        <div className="space-y-6 bg-white rounded-2xl shadow-sm border p-6">
          <ApiKeyInput onKeyChange={handleKeyChange} />

          {step === "upload" && (
            <>
              <ImageUploader onImagesChange={setImages} />

              {images.length > 0 && (
                <button
                  onClick={handleExtract}
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {`开始识别（${images.length} 张图片）`}
                </button>
              )}
            </>
          )}

          {step === "result" && (
            <>
              {loading && (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <svg
                      className="animate-spin h-5 w-5 text-blue-600"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span className="text-blue-600 font-medium">
                      识别中 {progress.current}/{progress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(progress.current / progress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <ResultTable data={results} onDataChange={setResults} autoFollowLatest={loading} />

              {!loading && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setStep("upload");
                      setResults([]);
                    }}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    返回重新上传
                  </button>
                  <button
                    onClick={handleDownload}
                    disabled={downloading || results.length === 0}
                    className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {downloading ? "生成中..." : "下载 Excel"}
                  </button>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by AI Vision + ExcelJS
        </p>
      </div>
    </main>
  );
}

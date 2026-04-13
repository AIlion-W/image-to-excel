import { NextRequest, NextResponse } from "next/server";
import { extractFromImage } from "@/lib/claude";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images, apiKey: userApiKey, prompt } = body as {
      images: { base64: string; mediaType: string; fileName: string }[];
      apiKey?: string;
      prompt?: string;
    };

    const apiKey = userApiKey || process.env.CLAUDE_PROXY_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "请提供 API Key" },
        { status: 400 }
      );
    }

    if (!images || images.length === 0) {
      return NextResponse.json({ error: "请上传至少一张图片" }, { status: 400 });
    }

    const baseURL = process.env.CLAUDE_PROXY_URL || undefined;
    const model = process.env.CLAUDE_PROXY_MODEL || undefined;

    const results = [];
    for (const img of images) {
      const result = await extractFromImage(
        img.base64,
        img.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        apiKey,
        baseURL,
        model,
        prompt
      );
      for (const item of result.items) {
        results.push({ ...item, _fileName: img.fileName });
      }
    }

    return NextResponse.json({ data: results });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "提取失败，请重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

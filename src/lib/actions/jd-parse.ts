"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

const jdSchema = z.object({
  companyName: z.string().nullable(),
  title: z.string().nullable(),
  location: z.string().nullable(),
  track: z.string().nullable(),
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  techFit: z.number().min(0).max(10),
  salaryScore: z.number().min(0).max(10),
  locationScore: z.number().min(0).max(10),
  growthScore: z.number().min(0).max(10),
  scoreReason: z.string(),
});

export type ParsedJd = z.infer<typeof jdSchema>;

// Job pages are often hundreds of KB where most bytes are inline scripts and
// styles. Truncating raw HTML would keep the <head> and drop the actual posting,
// so strip to visible text first, then cap length.
function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPageText(url: string): Promise<string> {
  let html: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      },
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch {
    throw new Error("无法访问该链接，请改用粘贴 JD 文字");
  }

  const text = htmlToText(html);
  // Most Chinese job boards render the posting client-side, so the served HTML
  // carries navigation chrome and nothing else. Say so instead of feeding the
  // model an empty page and returning confidently wrong fields.
  if (text.length < 200) {
    throw new Error("该网站内容是动态加载的，抓不到正文，请改用粘贴 JD 文字");
  }
  return text.slice(0, 12000);
}

type UserPreferences = {
  targetTrack: string | null;
  skills: string | null;
  preferredCities: string | null;
  expectedSalaryMin: number | null;
};

function describePreferences(prefs: UserPreferences): string {
  const lines = [
    prefs.targetTrack ? `求职方向：${prefs.targetTrack}` : null,
    prefs.skills ? `擅长技术栈/技能：${prefs.skills}` : null,
    prefs.preferredCities ? `期望城市：${prefs.preferredCities}` : null,
    prefs.expectedSalaryMin
      ? `期望月薪下限：${prefs.expectedSalaryMin}K`
      : null,
  ].filter(Boolean);

  return lines.length > 0
    ? lines.join("\n")
    : "（求职者没有填写任何偏好信息）";
}

async function extractFields(
  jdText: string,
  prefs: UserPreferences
): Promise<ParsedJd> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("尚未配置 Gemini API Key，联系管理员配置后再试");
  }

  const prompt = `你在帮一个求职者评估招聘岗位。下面给出求职者的偏好和一个岗位描述，请提取岗位信息并打分。

求职者偏好：
${describePreferences(prefs)}

岗位描述：
${jdText}

提取要求：
- 薪资统一换算成"K"（千元/月）为单位的数字，比如"15k-25k/月"就是 salaryMin=15, salaryMax=25；如果写的是年薪，换算成月薪
- track 指技术/业务方向，比如"后端开发""前端开发""产品经理""算法"等
- 岗位描述里没有明确提到的字段填 null，不要编造或猜测

打分要求（0-10 分，5 分表示中等/一般）：
- techFit：岗位要求的技术栈跟求职者擅长的技能匹配程度
- salaryScore：这个岗位的薪资水平（结合求职者的期望月薪下限判断，明显高于期望给高分，低于期望给低分）
- locationScore：工作地点跟求职者期望城市的吻合程度
- growthScore：这个岗位/公司的成长空间和平台价值
- scoreReason：用一到两句中文说明打分依据

重要：如果求职者没有填写某项偏好（比如没填技能），对应维度就给 5 分表示无法判断，并在 scoreReason 里说明"未填写XX，无法评估"，不要凭空猜测求职者的情况。`;

  let response: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            // Leaving the default budget on made this call ~10x slower (11s vs
            // 1.2s). Scoring needs a little more headroom than pure extraction,
            // but nowhere near the default. 0 is rejected with a 400.
            thinkingConfig: { thinkingBudget: 512 },
            responseSchema: {
              type: "OBJECT",
              properties: {
                companyName: { type: "STRING", nullable: true },
                title: { type: "STRING", nullable: true },
                location: { type: "STRING", nullable: true },
                track: { type: "STRING", nullable: true },
                salaryMin: { type: "NUMBER", nullable: true },
                salaryMax: { type: "NUMBER", nullable: true },
                techFit: { type: "NUMBER" },
                salaryScore: { type: "NUMBER" },
                locationScore: { type: "NUMBER" },
                growthScore: { type: "NUMBER" },
                scoreReason: { type: "STRING" },
              },
              required: [
                "companyName",
                "title",
                "location",
                "track",
                "salaryMin",
                "salaryMax",
                "techFit",
                "salaryScore",
                "locationScore",
                "growthScore",
                "scoreReason",
              ],
            },
          },
        }),
      }
    );
    clearTimeout(timeout);
  } catch {
    throw new Error("AI 解析请求超时，请稍后重试或手动填写");
  }

  if (!response.ok) {
    throw new Error("AI 解析请求失败，请稍后重试或手动填写");
  }

  const data = await response.json();
  const content: string =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(content);
  } catch {
    throw new Error("解析结果格式异常，请手动填写");
  }

  const result = jdSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new Error("解析结果格式异常，请手动填写");
  }

  return result.data;
}

export async function parseJd(input: {
  url?: string;
  text?: string;
}): Promise<ParsedJd> {
  const sessionUser = await requireUser();
  const user = await db.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    select: {
      targetTrack: true,
      skills: true,
      preferredCities: true,
      expectedSalaryMin: true,
    },
  });

  const pasted = input.text?.trim();
  if (pasted) {
    if (pasted.length < 20) throw new Error("粘贴的内容太短，看不出岗位信息");
    return extractFields(pasted.slice(0, 12000), user);
  }

  const url = input.url?.trim();
  if (!url) throw new Error("请粘贴 JD 文字或填写链接");

  return extractFields(await fetchPageText(url), user);
}

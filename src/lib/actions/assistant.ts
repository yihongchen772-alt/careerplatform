"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getUserAiConfig, callTextAi } from "@/lib/ai-providers";
import { buildTodos } from "@/lib/todos";
import { STAGE_LABELS } from "@/lib/stage-labels";
import { applicationStageValues } from "@/lib/validation";
import { computeInterestScore } from "@/lib/scoring";
import { toActionResult, UserFacingError, type ActionResult } from "@/lib/action-result";
import {
  assistantActionSchema,
  type AssistantAction,
  type AssistantChatMessage,
} from "@/lib/assistant-shared";

export type { AssistantAction, AssistantChatMessage };

// Keep the prompt bounded — a pool/application list that's grown large over
// a whole job-search season shouldn't blow up every single chat turn's cost.
const MAX_ITEMS = 25;
const MAX_HISTORY_TURNS = 8;

function ymd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function buildSnapshot(userId: string): Promise<string> {
  const [profile, positions, applications, stageHistories, personalTasks, resumeVersions] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: {
          school: true,
          targetTrack: true,
          graduationYear: true,
          skills: true,
          preferredCities: true,
          expectedSalaryMin: true,
        },
      }),
      db.position.findMany({
        where: { userId },
        include: { company: true },
        orderBy: { createdAt: "desc" },
        take: MAX_ITEMS,
      }),
      db.application.findMany({
        where: { userId },
        include: { company: true },
        orderBy: { appliedDate: "desc" },
        take: MAX_ITEMS,
      }),
      db.stageHistory.findMany({
        where: { application: { userId }, nextDeadline: { not: null } },
        include: { application: { include: { company: true } } },
      }),
      db.personalTask.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      db.resumeVersion.findMany({
        where: { userId },
        select: { id: true, name: true, targetTrack: true, checkScore: true, isDefault: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const todos = buildTodos(applications, positions, stageHistories, personalTasks);

  const sections: string[] = [];

  // Users say "下周五" / "这周三" constantly, and models are measurably bad
  // at the arithmetic. Spelling out the next two weeks turns the conversion
  // into a lookup instead of a calculation.
  const now = new Date();
  const calendar = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const label = i === 0 ? "今天" : i === 1 ? "明天" : i === 2 ? "后天" : "";
    return `${ymd(d)} 星期${"日一二三四五六"[d.getDay()]}${label ? `（${label}）` : ""}`;
  });
  sections.push(
    `日期对照（相对日期一律查这张表，不要自己推算）：\n${calendar.join("\n")}\n` +
      `"这周X"指本周内那一天，"下周X"指再往后一周的那一天。`
  );

  if (profile) {
    const bits = [
      profile.school ? `学校：${profile.school}` : null,
      profile.graduationYear ? `毕业年份：${profile.graduationYear}` : null,
      profile.targetTrack ? `目标方向：${profile.targetTrack}` : null,
      profile.skills ? `技能：${profile.skills}` : null,
      profile.preferredCities ? `意向城市：${profile.preferredCities}` : null,
      profile.expectedSalaryMin ? `期望月薪下限：${profile.expectedSalaryMin}K` : null,
    ].filter(Boolean);
    sections.push(
      "求职者本人：\n" + (bits.length === 0 ? "（个人资料没填，判断匹配度时说明这一点）" : bits.join("；"))
    );
  }

  sections.push(
    "候选岗位池：\n" +
      (positions.length === 0
        ? "（空）"
        : positions
            .map((p) => {
              const parts = [
                `${p.company.name} · ${p.title}`,
                p.track ? `方向：${p.track}` : null,
                p.location ? `地点：${p.location}` : null,
                p.salaryMin || p.salaryMax ? `薪资：${p.salaryMin ?? "?"}-${p.salaryMax ?? "?"}K` : null,
                p.interestScore != null ? `综合得分：${p.interestScore}` : null,
                p.deadline ? `截止：${ymd(p.deadline)}` : null,
                `状态：${p.status}`,
                p.jdText ? `JD 摘要：${p.jdText.slice(0, 300)}` : "（无 JD 正文）",
              ].filter(Boolean);
              return `- [岗位ID:${p.id}] ${parts.join("；")}`;
            })
            .join("\n"))
  );

  sections.push(
    "投递记录：\n" +
      (applications.length === 0
        ? "（空）"
        : applications
            .map((a) => {
              const parts = [
                `${a.company.name} · ${a.title}`,
                `阶段：${STAGE_LABELS[a.currentStage]}`,
                `投递日期：${ymd(a.appliedDate)}`,
                `进入当前阶段：${ymd(a.currentStageDate)}`,
              ].filter(Boolean);
              return `- [投递ID:${a.id}] ${parts.join("；")}`;
            })
            .join("\n"))
  );

  sections.push(
    "近期待办/截止日期（按紧急程度排序）：\n" +
      (todos.length === 0
        ? "（没有紧急事项）"
        : todos.map((t) => `- ${t.label}：${t.sublabel}`).join("\n"))
  );

  sections.push(
    "简历版本：\n" +
      (resumeVersions.length === 0
        ? "（还没上传过简历）"
        : resumeVersions
            .map(
              (r) =>
                `- ${r.name}${r.isDefault ? "（默认）" : ""}${r.targetTrack ? `，方向：${r.targetTrack}` : ""}${r.checkScore != null ? `，AI 体检分：${r.checkScore}` : "，还没做过 AI 体检"}`
            )
            .join("\n"))
  );

  return sections.join("\n\n");
}

const replySchema = z.object({
  reply: z.string(),
  actions: z.array(assistantActionSchema).nullish(),
});

export async function askAssistant(
  message: string,
  history: AssistantChatMessage[]
): Promise<ActionResult<{ reply: string; actions: AssistantAction[] }>> {
  return toActionResult(async () => {
    const user = await requireUser();
    if (!message.trim()) throw new UserFacingError("说点什么吧");

    // No hard requirement on a personal key here — this app has a shared
    // quota, so a null config just falls through to callTextAi's own
    // shared-Gemini fallback, same as the other AI features.
    const config = await getUserAiConfig(user.id);

    const snapshot = await buildSnapshot(user.id);
    const recentHistory = history.slice(-MAX_HISTORY_TURNS * 2);
    const historyText = recentHistory
      .map((h) => `${h.role === "user" ? "用户" : "助手"}：${h.content}`)
      .join("\n");

    const prompt = `你是这个求职跟踪 App 里的 AI 助手，帮用户快速看一眼自己的求职数据、做判断，而不是让用户自己一页页翻。你也帮用户把随口说的进展变成 App 里的记录，省得他自己去填表单。

用户当前的求职数据快照：
${snapshot}

${historyText ? `之前的对话：\n${historyText}\n` : ""}
用户现在说：${message}

回答要求：
- 直接用中文口语化回答，像同事帮忙看一眼，不要机械地照抄上面的数据列表
- 如果问题是"哪个岗位/投递最值得...""该选哪个"这类比较判断，逐一分析给出明确结论和理由，不要只罗列数据不表态；判断时要结合他的目标方向、意向城市、期望薪资和截止日期
- 只依据上面给出的数据快照回答；快照里没有的信息（比如某个岗位没有 JD 正文、简历没做过体检、个人资料没填）如实说明限制，不要编造
- 简短，一般 2-6 句话说清楚就行，除非用户明确要展开分析

关于 actions（可选，没有就给空数组）：
当用户说的话意味着数据该被记下来或改动时，在 actions 里提出建议，用户点一下就会执行。绝不要凭空替他决定——只有他确实表达了这个意思才提。可用的 type：
- add_task：加一条待办。title 填事情，date 填截止日（YYYY-MM-DD），note 可选
- log_application：记一条新投递。companyName + title 必填，date 填投递日期（没说就用今天）
- add_position：往候选岗位池里加一个还没投的岗位。companyName + title 必填，date 填截止日期，note 可写方向/地点
- update_stage：更新某条投递的阶段。targetId 填上面的[投递ID]，stage 从这些里选：${applicationStageValues.join(" / ")}，date 填下一步的时间（比如面试时间），note 可选
每个 action 的 label 写成用户一眼能看懂的按钮文案，比如"记一条投递：字节跳动 后端开发"或"更新为一面，面试时间 3月5日"。label 只是按钮上的字，不能代替上面那些字段——该填 title/companyName/targetId 的一个都不能少，别只写 label 就交差。
举例：用户说"我今天投了美团的数据分析，下周三一面"，就给两个 action —— 一个 log_application，一个提醒他准备面试的 add_task。`;

    const raw = await callTextAi({
      config,
      prompt,
      thinkingBudget: 1024,
      timeoutMs: 60000,
      schema: {
        type: "OBJECT",
        properties: {
          reply: { type: "STRING" },
          actions: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                type: {
                  type: "STRING",
                  enum: ["add_task", "log_application", "add_position", "update_stage"],
                },
                label: { type: "STRING" },
                companyName: { type: "STRING", nullable: true },
                title: { type: "STRING", nullable: true },
                date: { type: "STRING", nullable: true },
                stage: { type: "STRING", nullable: true, enum: applicationStageValues },
                targetId: { type: "STRING", nullable: true },
                note: { type: "STRING", nullable: true },
              },
              required: ["type", "label"],
            },
          },
        },
        required: ["reply", "actions"],
      },
    });

    const parsed = replySchema.safeParse(raw);
    if (!parsed.success) throw new UserFacingError("AI 返回格式异常，请重试");

    return { reply: parsed.data.reply, actions: parsed.data.actions ?? [] };
  });
}

/** YYYY-MM-DD (or anything Date can parse) -> Date, or null. */
function parseDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Executes one proposed action after the user has clicked it. Everything is
 * re-validated here rather than trusted from the model's output — the client
 * round-trip means the payload is user-controlled either way, and a
 * hallucinated 投递ID must not be able to touch another user's row (hence
 * the userId filter on every lookup).
 */
export async function applyAssistantAction(
  action: AssistantAction
): Promise<ActionResult<{ done: string }>> {
  return toActionResult(async () => {
    const user = await requireUser();
    const a = assistantActionSchema.parse(action);

    switch (a.type) {
      case "add_task": {
        // Models routinely put the whole task into `label` (the button
        // text) and leave `title` null. The label reads fine as a task
        // title, so fall back to it rather than leaving the user with a
        // button that only ever errors.
        const title = a.title?.trim() || a.label.trim();
        if (!title) throw new UserFacingError("这条待办没有标题，改成手动添加吧");
        await db.personalTask.create({
          data: {
            userId: user.id,
            title,
            note: a.note || undefined,
            dueDate: parseDate(a.date) ?? undefined,
          },
        });
        revalidatePath("/dashboard");
        revalidatePath("/calendar");
        return { done: `已加待办：${title}` };
      }

      case "log_application": {
        if (!a.companyName || !a.title) {
          throw new UserFacingError("公司或岗位名没给全，改成手动添加吧");
        }
        const appliedDate = parseDate(a.date) ?? new Date();
        const company = await db.company.upsert({
          where: { name: a.companyName },
          update: {},
          create: { name: a.companyName },
        });
        await db.$transaction(async (tx) => {
          const created = await tx.application.create({
            data: {
              userId: user.id,
              companyId: company.id,
              title: a.title!,
              appliedDate,
              source: a.note || undefined,
              currentStage: "APPLIED",
              currentStageDate: appliedDate,
            },
          });
          await tx.stageHistory.create({
            data: { applicationId: created.id, stage: "APPLIED", enteredAt: appliedDate },
          });
        });
        revalidatePath("/applications");
        revalidatePath("/dashboard");
        return { done: `已记录投递：${a.companyName} · ${a.title}` };
      }

      case "add_position": {
        if (!a.companyName || !a.title) {
          throw new UserFacingError("公司或岗位名没给全，改成手动添加吧");
        }
        const company = await db.company.upsert({
          where: { name: a.companyName },
          update: {},
          create: { name: a.companyName },
        });
        await db.position.create({
          data: {
            userId: user.id,
            companyId: company.id,
            title: a.title,
            deadline: parseDate(a.date) ?? undefined,
            jdText: a.note || undefined,
            source: "AI 助手",
            status: "EVALUATING",
            interestScore: computeInterestScore(undefined),
          },
        });
        revalidatePath("/pool");
        revalidatePath("/dashboard");
        return { done: `已加入候选池：${a.companyName} · ${a.title}` };
      }

      case "update_stage": {
        if (!a.targetId) throw new UserFacingError("没指明是哪条投递，改成手动更新吧");
        const stage = applicationStageValues.find((s) => s === a.stage);
        if (!stage) throw new UserFacingError("阶段名没认出来，改成手动更新吧");
        const application = await db.application.findFirst({
          where: { id: a.targetId, userId: user.id },
        });
        if (!application) throw new UserFacingError("找不到这条投递记录");
        await db.$transaction(async (tx) => {
          await tx.stageHistory.create({
            data: {
              applicationId: application.id,
              stage,
              note: a.note || undefined,
              nextDeadline: parseDate(a.date) ?? undefined,
            },
          });
          await tx.application.update({
            where: { id: application.id },
            data: { currentStage: stage, currentStageDate: new Date() },
          });
        });
        revalidatePath(`/applications/${application.id}`);
        revalidatePath("/applications");
        revalidatePath("/dashboard");
        return { done: `已更新为${STAGE_LABELS[stage]}` };
      }
    }
  });
}

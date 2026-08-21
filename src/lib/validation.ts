import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "密码至少 8 位"),
  name: z.string().min(1).optional(),
  school: z.string().optional(),
  targetTrack: z.string().optional(),
  graduationYear: z.coerce.number().int().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  school: z.string().optional(),
  targetTrack: z.string().optional(),
  graduationYear: z.coerce.number().int().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "密码至少 8 位"),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "密码至少 8 位"),
});

export const positionStatusValues = [
  "EVALUATING",
  "PLANNED",
  "APPLIED",
  "DROPPED",
] as const;

export const positionSchema = z.object({
  companyName: z.string().min(1, "公司名称必填"),
  title: z.string().min(1, "岗位名称必填"),
  track: z.string().optional(),
  location: z.string().optional(),
  salaryMin: z.coerce.number().int().optional().nullable(),
  salaryMax: z.coerce.number().int().optional().nullable(),
  jdText: z.string().optional(),
  jdUrl: z.string().optional(),
  source: z.string().optional(),
  deadline: z.coerce.date().optional().nullable(),
  status: z.enum(positionStatusValues).optional(),
  scoreBreakdown: z
    .object({
      techFit: z.number().min(0).max(10),
      salary: z.number().min(0).max(10),
      location: z.number().min(0).max(10),
      growth: z.number().min(0).max(10),
    })
    .partial()
    .optional(),
});

export const applicationStageValues = [
  "APPLIED",
  "SCREENING",
  "OA",
  "INTERVIEW_1",
  "INTERVIEW_2",
  "INTERVIEW_3",
  "HR_INTERVIEW",
  "OFFER",
  "REJECTED",
  "ACCEPTED",
  "DECLINED",
] as const;

export const applicationSchema = z.object({
  positionId: z.string().optional().nullable(),
  companyName: z.string().min(1, "公司名称必填"),
  title: z.string().min(1, "岗位名称必填"),
  appliedDate: z.coerce.date(),
  referrer: z.string().optional(),
  source: z.string().optional(),
  resumeVersionId: z.string().optional().nullable(),
});

export const offerUpdateSchema = z.object({
  salaryMin: z.coerce.number().int().optional().nullable(),
  salaryMax: z.coerce.number().int().optional().nullable(),
  offerNote: z.string().optional(),
});

export const stageUpdateSchema = z.object({
  stage: z.enum(applicationStageValues),
  note: z.string().optional(),
  interviewFormat: z.string().optional(),
  interviewer: z.string().optional(),
  nextDeadline: z.coerce.date().optional().nullable(),
});

export const resumeVersionSchema = z.object({
  name: z.string().min(1, "版本名称必填"),
  fileUrl: z.string().optional(),
  targetTrack: z.string().optional(),
});

export const companyDirectorySectors = [
  "互联网",
  "科技",
  "制造业",
  "金融",
  "物流",
  "消费/服务业",
  "其他",
] as const;

export const companyDirectoryEntrySchema = z.object({
  name: z.string().min(1, "公司名称必填"),
  careerUrl: z.string().url("请输入合法的链接"),
  sector: z.enum(companyDirectorySectors).optional(),
  industry: z.string().optional(),
});

export const reminderSchema = z.object({
  applicationId: z.string().optional().nullable(),
  dueDate: z.coerce.date(),
  type: z.string().min(1),
  note: z.string().optional(),
});

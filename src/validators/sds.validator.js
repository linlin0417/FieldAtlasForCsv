import { z } from 'zod';

const casNoPattern = /^\d{2,7}-\d{2}-\d$/;

const hazardListSchema = z.array(z.string().trim().min(1)).nonempty({ message: '危害分類不得為空' });

const firstAidSchema = z.object({
  Inhalation: z.string().trim().min(1, { message: '請填寫吸入處置方式' }),
  EyeContact: z.string().trim().min(1, { message: '請填寫眼睛接觸處置方式' }),
  SkinContact: z.string().trim().min(1, { message: '請填寫皮膚接觸處置方式' }),
  Ingestion: z.string().trim().min(1, { message: '請填寫食入處置方式' })
});

const preparedSdsSchema = z.object({
  CasNo: z.string().trim().regex(casNoPattern, { message: 'CAS No. 格式錯誤' }),
  ZhtwName: z.string().trim().min(1, { message: '請提供中文化學名稱' }),
  EnName: z.string().trim().min(1, { message: '請提供英文化學名稱' }),
  ChemicalFormula: z.string().trim().min(1, { message: '請提供化學式' }),
  HazardClassification: hazardListSchema,
  FirstAidMeasures: firstAidSchema,
  LD50: z.string().trim().min(1, { message: '請提供 LD50 資訊' }),
  StabilityAndReactivity: z.string().trim().min(1, { message: '請提供安定性與反應性資訊' })
});

export const querySchema = z.object({
  casNo: z.string().trim().optional()
});

export function normaliseHazardClassification(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map(item => (item ?? '').toString().trim())
      .filter(item => item.length > 0);
  }
  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }
  return [];
}

export function toInternalRecord(parsed) {
  return {
    casNo: parsed.CasNo,
    zhtwName: parsed.ZhtwName,
    enName: parsed.EnName,
    chemicalFormula: parsed.ChemicalFormula,
    hazardClassification: parsed.HazardClassification,
    firstAidMeasures: {
      inhalation: parsed.FirstAidMeasures.Inhalation,
      eyeContact: parsed.FirstAidMeasures.EyeContact,
      skinContact: parsed.FirstAidMeasures.SkinContact,
      ingestion: parsed.FirstAidMeasures.Ingestion
    },
    ld50: parsed.LD50,
    stabilityAndReactivity: parsed.StabilityAndReactivity
  };
}

export function parseSdsPayload(payload) {
  const source = payload ?? {};
  const hazardClassification = normaliseHazardClassification(source.HazardClassification);
  const candidate = {
    ...source,
    ChemicalFormula: source.ChemicalFormula,
    HazardClassification: hazardClassification
  };
  const parsed = preparedSdsSchema.parse(candidate);
  return toInternalRecord(parsed);
}

export function safeParseSdsPayload(payload) {
  const source = payload ?? {};
  const hazardClassification = normaliseHazardClassification(source.HazardClassification);
  const candidate = {
    ...source,
    ChemicalFormula: source.ChemicalFormula,
    HazardClassification: hazardClassification
  };
  const result = preparedSdsSchema.safeParse(candidate);
  if (!result.success) {
    return result;
  }
  return {
    success: true,
    data: toInternalRecord(result.data)
  };
}

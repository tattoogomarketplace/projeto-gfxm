import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Resultado estruturado da análise de Documentos Pessoais.
 */
export type KycDocumentAnalysis = {
  isValid: boolean;
  extractedName: string;
  /** Confiança da IA, normalizada de 0 a 100. */
  confidenceScore: number;
};

export type KycAnalysisInput = {
  base64: string;
  mimeType: string;
};

const DOCUMENTOS_PROMPT = `Você é um validador forense de documentos de identificação (Documentos Pessoais) de um marketplace profissional de tatuagens.
Analise o documento enviado e responda EXCLUSIVAMENTE com um objeto JSON no formato:
{ "isValid": boolean, "extractedName": string, "confidenceScore": number }

Regras:
1. "isValid" deve ser true SOMENTE se o arquivo for um documento de identificação legítimo (RG, CNH, CPF, passaporte, carteira profissional) ou comprovante oficial, estiver legível e não apresentar sinais evidentes de adulteração. Caso a imagem esteja ilegível, desfocada, cortada, seja uma selfie, paisagem, print genérico ou claramente não seja um documento, retorne false.
2. "extractedName" deve conter o nome completo do titular, exatamente como aparece no documento. Retorne "" se não for possível extrair.
3. "confidenceScore" é um número inteiro de 0 a 100 representando sua confiança na avaliação.
Não adicione explicações, comentários ou texto fora do JSON.`;

function clampScore(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

/**
 * Converte a resposta textual do modelo em um objeto estritamente tipado,
 * tolerando cercas de código Markdown que eventualmente vazem.
 */
export function parseKycAnalysis(raw: string): KycDocumentAnalysis {
  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Resposta da IA em formato inválido.');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Resposta da IA em formato inválido.');
  }

  const record = parsed as Record<string, unknown>;
  return {
    isValid: record.isValid === true,
    extractedName:
      typeof record.extractedName === 'string' ? record.extractedName.trim() : '',
    confidenceScore: clampScore(record.confidenceScore),
  };
}

/**
 * Envia o documento (imagem/PDF) em base64 ao Gemini para OCR e verificação de
 * autenticidade. A chave é resolvida em tempo de execução para que o build não
 * quebre em ambientes sem `GEMINI_API_KEY`; a rota devolve 503 nesse caso.
 */
export async function analyzeKycDocument(
  input: KycAnalysisInput
): Promise<KycDocumentAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.8-flash',
    generationConfig: { responseMimeType: 'application/json' },
  });

  const result = await model.generateContent([
    DOCUMENTOS_PROMPT,
    { inlineData: { data: input.base64, mimeType: input.mimeType } },
  ]);

  return parseKycAnalysis(result.response.text());
}

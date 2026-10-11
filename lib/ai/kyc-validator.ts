import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CredentialKind } from '@/lib/ai/document-forensics';

/**
 * Resultado estruturado da análise de Documentos Pessoais.
 */
export type KycDocumentAnalysis = {
  isValid: boolean;
  extractedName: string;
  /** Confiança da IA, normalizada de 0 a 100. */
  confidenceScore: number;
  documentType?: string;
  rejectionReason?: string;
};

export type KycAnalysisInput = {
  base64: string;
  mimeType: string;
  kind?: CredentialKind;
};

const DOCUMENTOS_PROMPT = `Você é um validador forense de documentos de identificação (Documentos Pessoais) de um marketplace profissional de tatuagens.
Analise o documento enviado e responda EXCLUSIVAMENTE com um objeto JSON no formato:
{ "isValid": boolean, "extractedName": string, "confidenceScore": number, "documentType": string, "rejectionReason": string }

Regras:
1. "isValid" deve ser true SOMENTE se o arquivo for um documento de identificação legítimo (RG, CNH, CPF, passaporte, carteira profissional) ou comprovante oficial, estiver legível e não apresentar sinais evidentes de adulteração. Caso a imagem esteja ilegível, desfocada, cortada, seja uma selfie, paisagem, print genérico ou claramente não seja um documento, retorne false.
2. "extractedName" deve conter o nome completo do titular, exatamente como aparece no documento. Retorne "" se não for possível extrair.
3. "confidenceScore" é um número inteiro de 0 a 100 representando sua confiança na avaliação.
4. "documentType" deve identificar o tipo (RG, CNH, passaporte, CPF, carteira profissional ou "desconhecido").
5. "rejectionReason" deve ser uma frase curta em português explicando a recusa. Use "" quando isValid for true.
Não adicione explicações, comentários ou texto fora do JSON.`;

const DIPLOMA_PROMPT = `Você é um validador forense de credenciais profissionais de tatuagem.
Analise o arquivo enviado (diploma, certificado de curso, carteira sanitária, comprovante de atuação ou portfólio institucional) e responda EXCLUSIVAMENTE com um objeto JSON no formato:
{ "isValid": boolean, "extractedName": string, "confidenceScore": number, "documentType": string, "rejectionReason": string }

Regras:
1. "isValid" deve ser true SOMENTE se o arquivo for um comprovante profissional legítimo relacionado a tatuagem, biossegurança, artes visuais aplicadas à pele, curso técnico/profissionalizante, diploma ou documento sanitário oficial, estiver legível e sem adulteração evidente. Selfies, prints de chat, paisagens, memes, documentos pessoais (RG/CNH) isolados ou arquivos ilegíveis devem retornar false.
2. "extractedName" deve conter o nome do titular/aluno exatamente como aparece. Retorne "" se não for possível extrair.
3. "confidenceScore" é um número inteiro de 0 a 100.
4. "documentType" deve identificar o tipo (diploma, certificado, carteira sanitaria, comprovante de atuacao ou "desconhecido").
5. "rejectionReason" deve ser uma frase curta em português explicando a recusa. Use "" quando isValid for true.
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
  const rejectionReason =
    typeof record.rejectionReason === 'string' ? record.rejectionReason.trim() : '';
  return {
    isValid: record.isValid === true,
    extractedName:
      typeof record.extractedName === 'string' ? record.extractedName.trim() : '',
    confidenceScore: clampScore(record.confidenceScore),
    documentType: typeof record.documentType === 'string' ? record.documentType.trim() : '',
    rejectionReason,
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

  const prompt = input.kind === 'habilidade' ? DIPLOMA_PROMPT : DOCUMENTOS_PROMPT;

  const result = await model.generateContent([
    prompt,
    { inlineData: { data: input.base64, mimeType: input.mimeType } },
  ]);

  return parseKycAnalysis(result.response.text());
}

export type DualCredentialVerdict = {
  approved: boolean;
  status: 'aprovado' | 'rejeitado' | 'em_analise';
  extractedName: string;
  confidenceScore: number;
  reason: string | null;
};

const MIN_AUTO_APPROVE_SCORE = 60;

export function composeDualCredentialVerdict(
  personal: KycDocumentAnalysis,
  professional: KycDocumentAnalysis,
  namesMatch: boolean
): DualCredentialVerdict {
  const extractedName = personal.extractedName || professional.extractedName;
  const confidenceScore = Math.min(personal.confidenceScore, professional.confidenceScore);

  if (!personal.isValid) {
    return {
      approved: false,
      status: 'rejeitado',
      extractedName,
      confidenceScore,
      reason:
        personal.rejectionReason ||
        'O documento pessoal não foi reconhecido como identificação oficial nítida.',
    };
  }

  if (!professional.isValid) {
    return {
      approved: false,
      status: 'rejeitado',
      extractedName,
      confidenceScore,
      reason:
        professional.rejectionReason ||
        'O comprovante profissional não foi reconhecido como diploma, certificado ou credencial oficial.',
    };
  }

  if (!namesMatch) {
    return {
      approved: false,
      status: 'rejeitado',
      extractedName,
      confidenceScore,
      reason: 'O nome do documento pessoal não confere com o comprovante profissional.',
    };
  }

  if (confidenceScore < MIN_AUTO_APPROVE_SCORE) {
    return {
      approved: false,
      status: 'em_analise',
      extractedName,
      confidenceScore,
      reason: 'A confiança da análise ficou abaixo do limiar automático. Envie documentos mais nítidos.',
    };
  }

  return {
    approved: true,
    status: 'aprovado',
    extractedName,
    confidenceScore,
    reason: null,
  };
}

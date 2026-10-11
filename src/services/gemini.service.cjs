const { GoogleGenerativeAI } = require("@google/generative-ai");
const CircuitBreaker = require("opossum");
const { geminiApiKey } = require("../config/env.cjs");

const TRANSIENT_CODES = new Set([401, 403, 408, 429, 500, 502, 503, 504]);

function extractStatus(error) {
  const direct = Number(error?.status || error?.statusCode || error?.code);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const nested = Number(
    error?.response?.status ||
      error?.cause?.status ||
      error?.errorDetails?.[0]?.reason
  );
  if (Number.isFinite(nested) && nested > 0) return nested;
  const message = String(error?.message || "");
  const match = message.match(/\b(401|403|408|429|500|502|503|504)\b/);
  return match ? Number(match[1]) : 0;
}

function isTransientGeminiError(error) {
  const status = extractStatus(error);
  if (TRANSIENT_CODES.has(status)) return true;
  const message = String(error?.message || error || "").toLowerCase();
  return (
    message.includes("403") ||
    message.includes("permission") ||
    message.includes("unauthorized") ||
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("econn") ||
    message.includes("aborted")
  );
}

const genAI = new GoogleGenerativeAI(geminiApiKey || "");
const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

const runGeminiAI = async (imagemBase64Limpa) => {
  if (!geminiApiKey) {
    return "TIMEOUT_OU_FALHA_EXTERNA";
  }
  try {
    const promptText =
      "Analise esta imagem estritamente. Responda apenas SIM se for uma foto real de arte de tatuagem, pele tatuada ou desenho de flash tattoo elegível. Responda NAO se contiver nudez explícita, violência, conteúdo impróprio ou não for uma tatuagem.";
    const imageParts = [
      {
        inlineData: {
          data: imagemBase64Limpa,
          mimeType: "image/jpeg",
        },
      },
    ];
    const result = await model.generateContent([promptText, ...imageParts]);
    return result.response.text().trim().toUpperCase();
  } catch (error) {
    if (isTransientGeminiError(error)) {
      console.warn("[gemini] 403/rede na moderação de imagem; fallback ativo.", {
        status: extractStatus(error),
      });
      return "TIMEOUT_OU_FALHA_EXTERNA";
    }
    throw error;
  }
};

const aiBreaker = new CircuitBreaker(runGeminiAI, {
  timeout: 8000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});
aiBreaker.fallback(() => "TIMEOUT_OU_FALHA_EXTERNA");

async function moderateTattooImage(imagemBase64Limpa) {
  return aiBreaker.fire(imagemBase64Limpa);
}

const runChatModeration = async (mensagem) => {
  if (!geminiApiKey) {
    return "TIMEOUT_OU_FALHA_EXTERNA";
  }
  try {
    const promptText = [
      "Voce e o moderador do chat de duvidas do marketplace TattooGo.",
      "O chat e EXCLUSIVAMENTE para duvidas sobre o servico de tatuagem.",
      "Responda apenas DUVIDA_OK se a mensagem for uma duvida legitima sobre tatuagem, agendamento, estilo, tamanho, cicatrizacao ou local.",
      "Responda NEGOCIACAO se houver tentativa de pagar por fora, pedir contato externo, preco combinado fora da plataforma ou link de pagamento.",
      "Responda FORA_DO_ESCOPO se nao for uma duvida sobre o servico.",
      "Mensagem:",
      mensagem,
    ].join(" ");
    const result = await model.generateContent(promptText);
    return result.response.text().trim().toUpperCase();
  } catch (error) {
    if (isTransientGeminiError(error)) {
      console.warn("[gemini] 403/rede na moderação de chat; fallback ativo.", {
        status: extractStatus(error),
      });
      return "TIMEOUT_OU_FALHA_EXTERNA";
    }
    throw error;
  }
};

const chatBreaker = new CircuitBreaker(runChatModeration, {
  timeout: 8000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});
chatBreaker.fallback(() => "TIMEOUT_OU_FALHA_EXTERNA");

async function moderateChatDuvida(mensagem) {
  return chatBreaker.fire(mensagem);
}

module.exports = { moderateTattooImage, moderateChatDuvida, aiBreaker, chatBreaker };

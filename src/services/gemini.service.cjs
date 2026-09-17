const { GoogleGenerativeAI } = require("@google/generative-ai");
const CircuitBreaker = require("opossum");
const { geminiApiKey } = require("../config/env.cjs");

const genAI = new GoogleGenerativeAI(geminiApiKey);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const runGeminiAI = async (imagemBase64Limpa) => {
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

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

module.exports = { moderateTattooImage, aiBreaker };

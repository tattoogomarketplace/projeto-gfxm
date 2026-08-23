import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializa o Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const moderateImageWithGemini = async (base64Image: string): Promise<boolean> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Você é um moderador de um marketplace de tatuagens. Analise esta imagem.
Retorne APENAS a palavra 'APROVADO' se for uma tatuagem, um desenho, estúdio ou profissional seguro. 
Retorne 'REJEITADO' se contiver nudez explícita, violência extrema, sangue real excessivo, conteúdo sexual ou violação de diretrizes.
Não adicione explicações.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    const text = response.text().trim();
    
    return text === 'APROVADO';
  } catch (error) {
    console.error("Erro na moderação por IA:", error);
    return false; // Por segurança, rejeita se a IA falhar
  }
};

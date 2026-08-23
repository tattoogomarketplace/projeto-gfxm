import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY não configurada no .env");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function moderateChatContent(message: string): Promise<{ allowed: boolean; reason?: string }> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    Analise a seguinte mensagem de chat de uma plataforma de tatuagem profissional: "${message}".
    Responda EXCLUSIVAMENTE em formato JSON: { "allowed": boolean, "reason": string | null }.
    Regras de BLOQUEIO: 
    1. Links de qualquer tipo (URLs).
    2. Menções a WhatsApp, Instagram ou redes sociais.
    3. Qualquer menção a formas de pagamento fora da plataforma (PIX direto, conta bancária, etc).
    4. Linguagem ofensiva, assédio, tentativa de fraude OU CONTEÚDO SEXUAL/INAPROPRIADO.
  `;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonString = responseText.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Erro na moderação IA:", error);
    return { allowed: false, reason: "Falha na análise de segurança." };
  }
}


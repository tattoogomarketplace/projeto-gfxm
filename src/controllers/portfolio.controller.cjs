const { z } = require("zod");
const portfolioService = require("../services/portfolio.service.cjs");

const portfolioSchema = z.object({
  artista_id: z.string(),
  titulo: z.string().min(2).max(100).transform((val) => val.trim()),
  estilo: z.string().min(2).max(50).transform((val) => val.trim()),
  preco_estimado: z.number().positive("O preço estimado deve ser maior que zero."),
  imagem_base64: z.string().min(10, "Formato de imagem inválido."),
});

async function uploadValidado(req, res) {
  try {
    const validacao = portfolioSchema.safeParse(req.body);
    if (!validacao.success) {
      const message = validacao.error.issues?.[0]?.message || validacao.error.errors?.[0]?.message;
      return res.status(400).json({ sucesso: false, erro: message });
    }

    const { artista_id, titulo, estilo, imagem_base64 } = validacao.data;
    const portfolio = await portfolioService.uploadValidatedPortfolio({
      user: req.user,
      accessToken: req.accessToken,
      artistaId: artista_id,
      titulo,
      estilo,
      imagemBase64: imagem_base64,
    });

    return res.status(200).json({ sucesso: true, portfolio });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ sucesso: false, erro: err.message });
    }
    req.log.error({ err }, "Erro na Validação de Imagem");
    return res.status(500).json({ sucesso: false, erro: "Erro no processamento de moderação visual." });
  }
}

async function like(req, res) {
  try {
    const { id } = req.params;
    const likesCount = await portfolioService.incrementLike(req.user.id, id);
    return res.status(200).json({ sucesso: true, likes_count: likesCount });
  } catch {
    return res.status(500).json({ sucesso: false });
  }
}

module.exports = { uploadValidado, like };

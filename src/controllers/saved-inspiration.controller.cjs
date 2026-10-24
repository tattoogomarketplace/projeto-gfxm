const savedInspirationService = require("../services/saved-inspiration.service.cjs");

async function toggle(req, res) {
  try {
    const userId = req.user?.clerkId;
    const postId = req.params?.postId || req.body?.postId;

    if (!userId || !postId) {
      return res.status(400).json({
        success: false,
        sucesso: false,
        erro: "userId e postId são obrigatórios.",
      });
    }

    const result = await savedInspirationService.toggleSave(userId, postId);
    return res.status(200).json({
      success: true,
      sucesso: true,
      isSaved: result.isSaved,
      message: result.message,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({
        success: false,
        sucesso: false,
        erro: err.message,
      });
    }
    req.log?.error({ err }, "Falha ao alternar inspiração salva");
    return res.status(500).json({
      success: false,
      sucesso: false,
      erro: err?.message || "Falha ao salvar a inspiração.",
    });
  }
}

module.exports = { toggle };

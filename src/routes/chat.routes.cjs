const { Router } = require("express");
const chatController = require("../controllers/chat.controller.cjs");
const flashNotesController = require("../controllers/flash-notes.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");
const { authLimiter } = require("../middlewares/rate-limit.cjs");

const router = Router();

router.post("/enviar", authLimiter, requireAuth, chatController.enviar);
router.post("/enviar-mensagem", authLimiter, requireAuth, chatController.enviar);
router.get("/historico", requireAuth, chatController.historico);
router.post("/lido", requireAuth, chatController.marcarLido);
router.get("/conversas", requireAuth, chatController.conversas);
router.get("/contexto", requireAuth, chatController.contexto);
router.get("/flash-notes", requireAuth, flashNotesController.listar);
router.post("/flash-notes", requireAuth, flashNotesController.criar);
router.patch("/flash-notes/:id", requireAuth, flashNotesController.atualizar);
router.delete("/flash-notes/:id", requireAuth, flashNotesController.deletar);

module.exports = router;

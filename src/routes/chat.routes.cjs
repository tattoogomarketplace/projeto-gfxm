const { Router } = require("express");
const chatController = require("../controllers/chat.controller.cjs");
const flashNotesController = require("../controllers/flash-notes.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");

const router = Router();

router.post("/enviar", requireAuth, chatController.enviar);
router.post("/enviar-mensagem", requireAuth, chatController.enviar);
router.get("/historico", requireAuth, chatController.historico);
router.post("/lido", requireAuth, chatController.marcarLido);
router.get("/conversas", requireAuth, chatController.conversas);
router.get("/flash-notes", requireAuth, flashNotesController.listar);
router.post("/flash-notes", requireAuth, flashNotesController.criar);

module.exports = router;

const { Router } = require("express");
const chatController = require("../controllers/chat.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");

const router = Router();

router.post("/enviar", requireAuth, chatController.enviar);
router.post("/enviar-mensagem", requireAuth, chatController.enviar);
router.get("/historico", requireAuth, chatController.historico);
router.post("/lido", requireAuth, chatController.marcarLido);

module.exports = router;

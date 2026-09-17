const { Router } = require("express");
const chatController = require("../controllers/chat.controller.cjs");

const router = Router();

router.post("/enviar", chatController.enviar);
router.post("/enviar-mensagem", chatController.enviar);

module.exports = router;

const { Router } = require("express");
const sessoesController = require("../controllers/sessoes.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");

const router = Router();

router.get("/", requireAuth, sessoesController.listar);

module.exports = router;

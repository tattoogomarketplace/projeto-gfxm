const { Router } = require("express");
const galeriaController = require("../controllers/galeria.controller.cjs");

const router = Router();

router.get("/", galeriaController.list);

module.exports = router;

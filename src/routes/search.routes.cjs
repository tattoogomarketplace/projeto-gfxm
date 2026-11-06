const { Router } = require("express");
const searchController = require("../controllers/search.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");

const router = Router();

router.get("/", requireAuth, searchController.search);

module.exports = router;

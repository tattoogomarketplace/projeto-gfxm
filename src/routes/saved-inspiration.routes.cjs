const { Router } = require("express");
const savedInspirationController = require("../controllers/saved-inspiration.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");

const router = Router();

router.post("/:postId/save", requireAuth, savedInspirationController.toggle);

module.exports = router;

const { Router } = require("express");
const viewsController = require("../controllers/views.controller.cjs");
const { optionalAuth } = require("../middlewares/auth.cjs");

const router = Router();

router.post("/batch", optionalAuth, viewsController.registerBatch);
router.get("/:postId", optionalAuth, viewsController.getViewers);

module.exports = router;

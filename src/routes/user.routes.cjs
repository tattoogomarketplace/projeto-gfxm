const { Router } = require("express");
const usernameController = require("../controllers/username.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");

const router = Router();

router.get("/username", requireAuth, usernameController.check);
router.post("/username", requireAuth, usernameController.claim);
router.put("/username", requireAuth, usernameController.claim);
router.post("/username/action", requireAuth, usernameController.updateAction);

router.get("/language", requireAuth, usernameController.getLanguage);
router.post("/language", requireAuth, usernameController.setLanguage);
router.put("/language", requireAuth, usernameController.setLanguage);

module.exports = router;

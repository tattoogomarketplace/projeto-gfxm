const { Router } = require("express");
const flashNoteBookingController = require("../controllers/flash-note-booking.controller.cjs");
const { requireAuth } = require("../middlewares/auth.cjs");

const router = Router();

router.post("/:id/book", requireAuth, flashNoteBookingController.book);

module.exports = router;

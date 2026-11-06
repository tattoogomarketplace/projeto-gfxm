const flashNoteBookingService = require("../services/flash-note-booking.service.cjs");

async function book(req, res) {
  try {
    const result = await flashNoteBookingService.bookFlashNote({
      actor: {
        id: req.user.id,
        role: req.user.role || req.perfil?.role,
        clerkId: req.user.clerkId,
        deleted_at: null,
      },
      noteId: req.params.id,
    });
    return res.status(200).json(result);
  } catch (err) {
    const code = err.code || "CONFLICT";
    const status = err.status || 500;
    return res.status(status).json({
      success: false,
      error: err.message || "Falha ao garantir a oferta.",
      code,
    });
  }
}

module.exports = { book };

const viewsService = require("../services/views.service.cjs");

async function registerBatch(req, res) {
  try {
    const result = await viewsService.registerViewBatch({
      postIds: req.body?.postIds,
      visitorToken: req.body?.visitorToken,
      userId: req.user?.clerkId || null,
    });
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: "Falha ao registrar visualizações." });
  }
}

async function getViewers(req, res) {
  try {
    const result = await viewsService.getPostViewers(req.params.postId);
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ success: false, error: err.message });
    }
    return res.status(500).json({ success: false, error: "Falha ao carregar visualizações." });
  }
}

module.exports = { registerBatch, getViewers };

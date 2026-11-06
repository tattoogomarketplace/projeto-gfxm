const seedService = require("../services/seed.service.cjs");

async function seed(req, res) {
  try {
    const userId = req.user?.clerkId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const result = await seedService.seedSavedPosts(userId);
    return res.status(200).json(result);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    req.log?.error({ err }, "[api/dev/seed] falha ao semear posts");
    return res.status(500).json({ error: String(err) });
  }
}

module.exports = { seed };

function errorHandler(err, req, res, next) {
  void next;
  if (req.log) {
    req.log.error({ err }, "Unhandled API error");
  }
  return res.status(500).json({ sucesso: false, erro: "Falha interna de servidor." });
}

module.exports = { errorHandler };

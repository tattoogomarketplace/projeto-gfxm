const transactionService = require("../services/transaction.service.cjs");

function fail(res, err, fallback) {
  if (err && err.status) {
    return res.status(err.status).json({ success: false, error: err.message });
  }
  return res.status(500).json({ success: false, error: fallback });
}

function ok(res, data) {
  return res.status(200).json({ success: true, data });
}

async function acquireLock(req, res) {
  try {
    const data = await transactionService.acquireTimeslotLock(req.body || {});
    return ok(res, data);
  } catch (err) {
    return fail(res, err, "Falha ao adquirir o mutex do slot.");
  }
}

async function releaseLock(req, res) {
  try {
    const data = await transactionService.releaseTimeslotLock(req.body || {});
    return ok(res, data);
  } catch (err) {
    return fail(res, err, "Falha ao liberar o mutex do slot.");
  }
}

async function checkLock(req, res) {
  try {
    const data = await transactionService.checkTimeslotLock({
      tatuadorId: req.query.tatuadorId ?? req.body?.tatuadorId,
      dataHora: req.query.dataHora ?? req.body?.dataHora,
    });
    return ok(res, data);
  } catch (err) {
    return fail(res, err, "Falha ao consultar o mutex do slot.");
  }
}

async function deposit(req, res) {
  try {
    const data = await transactionService.processDepositPayment({
      actorId: req.user.id,
      sessionId: req.body?.sessionId,
      idempotencyKey: req.body?.idempotencyKey,
      gatewayId: req.body?.gatewayId,
      method: req.body?.method,
    });
    return ok(res, data);
  } catch (err) {
    return fail(res, err, "Falha ao processar o depósito.");
  }
}

async function refund(req, res) {
  try {
    const data = await transactionService.cancelAndRefundSession({
      actorId: req.user.id,
      sessionId: req.body?.sessionId,
      reason: req.body?.reason,
    });
    return ok(res, data);
  } catch (err) {
    return fail(res, err, "Falha ao cancelar a sessão.");
  }
}

async function payout(req, res) {
  try {
    const data = await transactionService.validateStudioSessionPass({
      actorId: req.user.id,
      sessionId: req.body?.sessionId ?? req.params.sessionId,
      passCode: req.body?.passCode,
      idempotencyKey: req.body?.idempotencyKey,
    });
    return ok(res, data);
  } catch (err) {
    return fail(res, err, "Falha ao validar a sessão.");
  }
}

module.exports = { acquireLock, releaseLock, checkLock, deposit, refund, payout };

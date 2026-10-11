export const getCancelAction = (dataHora: string) => {
  const agendamentoData = new Date(dataHora);
  const limiteCancelamento = new Date();
  limiteCancelamento.setDate(limiteCancelamento.getDate() + 3);

  return agendamentoData > limiteCancelamento ? 'AUTO_CANCEL' : 'CONTATAR_SUPORTE';
};

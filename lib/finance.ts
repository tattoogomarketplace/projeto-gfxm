export const calculateSplits = (valorTotal: number, tipo: 'solo' | 'estudio') => {
  const plataformaTax = tipo === 'solo' ? 0.09 : 0.08;
  const estudioTax = tipo === 'solo' ? 0 : 0.03;
  const reservaTax = 0.01;
  const tatuadorTax = 1 - (plataformaTax + estudioTax + reservaTax);

  return {
    tatuador: Number((valorTotal * tatuadorTax).toFixed(2)),
    plataforma: Number((valorTotal * plataformaTax).toFixed(2)),
    estudio: Number((valorTotal * estudioTax).toFixed(2)),
    reserva: Number((valorTotal * reservaTax).toFixed(2)),
  };
};

export const generateIdempotencyKey = (agendamentoId: string, version: number) => {
  return `tx_${agendamentoId}_v${version}`;
};

export const handleSinalPayment = async (agendamentoId: string, valorTotal: number) => {
  void agendamentoId;
  void valorTotal;
  return { success: false, transactionId: null };
};


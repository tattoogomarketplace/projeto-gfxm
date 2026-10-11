export const maskCPF = (cpf?: string | null) => {
  if (cpf == null || cpf === '') return '***.***.***-**';
  return String(cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.$2.$3-**');
};

export const maskEmail = (email?: string | null) => {
  if (email == null || email === '') return '***';
  const [user, domain] = String(email).split('@');
  if (!user || !domain) return '***';
  return `${user[0] ?? '*'}***@${domain}`;
};

export const maskBankAccount = (account?: string | null) => {
  if (account == null || account === '') return '***';
  const value = String(account);
  return `***${value.slice(-4)}`;
};

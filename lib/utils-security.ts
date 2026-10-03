export const maskCpf = (cpf?: string | null) => {
  if (cpf == null || cpf === '') return '***.***.***-**';
  return String(cpf).replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.$2.$3-**');
};

export const maskEmail = (email?: string | null) => {
  if (email == null || email === '') return '***';
  const [name, domain] = String(email).split('@');
  if (!name || !domain) return '***';
  return `${name[0] ?? '*'}***@${domain}`;
};

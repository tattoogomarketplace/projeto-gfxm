export const maskCpf = (cpf: string) => cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.$2.$3-**');
export const maskEmail = (email: string) => {
  const [name, domain] = email.split('@');
  return `${name[0]}***@${domain}`;
};

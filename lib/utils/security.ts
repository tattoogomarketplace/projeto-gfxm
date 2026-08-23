export const maskCPF = (cpf: string) => {
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "***.$2.$3-**");
};

export const maskEmail = (email: string) => {
  const [user, domain] = email.split("@");
  return `${user[0]}***@${domain}`;
};

export const maskBankAccount = (account: string) => {
  return `***${account.slice(-4)}`;
};

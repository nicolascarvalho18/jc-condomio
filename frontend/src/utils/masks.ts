/**
 * Funções utilitárias de formatação, máscaras e validação matemática de documentos brasileiros.
 */

export const stripNonDigits = (val: string = ''): string => {
  return val.replace(/\D/g, '');
};

export const maskCpf = (val: string = ''): string => {
  const digits = stripNonDigits(val).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
};

export const maskCnpj = (val: string = ''): string => {
  const digits = stripNonDigits(val).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
};

export const maskCpfCnpj = (val: string = ''): string => {
  const digits = stripNonDigits(val);
  if (digits.length <= 11) {
    return maskCpf(digits);
  }
  return maskCnpj(digits);
};

export const maskCep = (val: string = ''): string => {
  const digits = stripNonDigits(val).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, '$1-$2');
};

export const maskPhone = (val: string = ''): string => {
  const digits = stripNonDigits(val).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/^(\(\d{2}\)\s)(\d{4})(\d)/, '$1$2-$3');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/^(\(\d{2}\)\s)(\d{5})(\d)/, '$1$2-$3');
};

export const isValidCpf = (cpf: string): boolean => {
  const digits = stripNonDigits(cpf);
  if (digits.length !== 11) return false;

  // Rejeita padrões com todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let firstRemainder = 11 - (sum % 11);
  let firstDigit = firstRemainder >= 10 ? 0 : firstRemainder;

  if (firstDigit !== parseInt(digits.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  let secondRemainder = 11 - (sum % 11);
  let secondDigit = secondRemainder >= 10 ? 0 : secondRemainder;

  return secondDigit === parseInt(digits.charAt(10), 10);
};

export const isValidCnpj = (cnpj: string): boolean => {
  const digits = stripNonDigits(cnpj);
  if (digits.length !== 14) return false;

  // Rejeita padrões com todos os dígitos iguais
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const weightsFirst = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weightsSecond = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits.charAt(i), 10) * weightsFirst[i];
  }
  let firstRemainder = sum % 11;
  let firstDigit = firstRemainder < 2 ? 0 : 11 - firstRemainder;

  if (firstDigit !== parseInt(digits.charAt(12), 10)) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(digits.charAt(i), 10) * weightsSecond[i];
  }
  let secondRemainder = sum % 11;
  let secondDigit = secondRemainder < 2 ? 0 : 11 - secondRemainder;

  return secondDigit === parseInt(digits.charAt(13), 10);
};

export const isValidCpfCnpj = (val: string): boolean => {
  const digits = stripNonDigits(val);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
};

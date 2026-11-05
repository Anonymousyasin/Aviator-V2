export const formatBDT = (amount: number): string => {
  return '৳' + amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatCompactBDT = (amount: number): string => {
  if (amount >= 100000) {
    return `৳${(amount / 1000).toFixed(1)}k`;
  }
  return '৳' + Math.round(amount).toLocaleString('en-US');
};

export const isValidBDPhone = (phone: string): boolean => {
  return /^01[3-9]\d{8}$/.test(phone.trim());
};

export const BD_NAMES = [
  'Tanvir', 'Rahim', 'Sumi', 'Shakib', 'Mitu',
  'Arif', 'Nusrat', 'Hasan', 'Rony', 'Joya',
  'Sajib', 'Tamim', 'Farhan', 'Sadia', 'Kawsar',
  'Mehedi', 'Anik', 'Munna', 'Fatema', 'Ayesha'
];

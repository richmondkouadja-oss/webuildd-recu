const UNITS = [
  '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
];

const TENS = [
  '', 'dix', 'vingt', 'trente', 'quarante', 'cinquante',
  'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt',
];

function convertHundreds(n: number): string {
  if (n === 0) return '';

  let result = '';

  if (n >= 100) {
    const centaines = Math.floor(n / 100);
    if (centaines === 1) {
      result = 'cent';
    } else {
      result = UNITS[centaines] + ' cent';
    }
    n %= 100;
    if (n === 0) {
      // "deux cents" (avec s) seulement si rien ne suit
      if (centaines > 1) result += 's';
      return result;
    }
    result += ' ';
  }

  if (n < 20) {
    result += UNITS[n];
  } else {
    const dizaine = Math.floor(n / 10);
    const unite = n % 10;

    if (dizaine === 7 || dizaine === 9) {
      // 70-79: soixante-dix..., 90-99: quatre-vingt-dix...
      const base = TENS[dizaine];
      const remainder = (dizaine === 7 ? 10 : 10) + unite;
      if (dizaine === 7 && unite === 1) {
        result += base + ' et onze';
      } else {
        result += base + '-' + UNITS[remainder];
      }
    } else if (dizaine === 8) {
      if (unite === 0) {
        result += 'quatre-vingts'; // avec s
      } else {
        result += 'quatre-vingt-' + UNITS[unite];
      }
    } else {
      result += TENS[dizaine];
      if (unite === 1 && dizaine !== 8) {
        result += ' et un';
      } else if (unite > 0) {
        result += '-' + UNITS[unite];
      }
    }
  }

  return result;
}

export function numberToWordsFr(amount: number): string {
  if (amount === 0) return 'zéro franc CFA';
  if (!Number.isFinite(amount) || amount < 0) return '';

  amount = Math.floor(amount);

  const parts: string[] = [];

  // Milliards
  const milliards = Math.floor(amount / 1_000_000_000);
  if (milliards > 0) {
    if (milliards === 1) {
      parts.push('un milliard');
    } else {
      parts.push(convertHundreds(milliards) + ' milliards');
    }
    amount %= 1_000_000_000;
  }

  // Millions
  const millions = Math.floor(amount / 1_000_000);
  if (millions > 0) {
    if (millions === 1) {
      parts.push('un million');
    } else {
      parts.push(convertHundreds(millions) + ' millions');
    }
    amount %= 1_000_000;
  }

  // Milliers
  const milliers = Math.floor(amount / 1_000);
  if (milliers > 0) {
    if (milliers === 1) {
      parts.push('mille');
    } else {
      parts.push(convertHundreds(milliers) + ' mille');
    }
    amount %= 1_000;
  }

  // Centaines et unités
  if (amount > 0) {
    parts.push(convertHundreds(amount));
  }

  let result = parts.join(' ').trim();

  // Capitalize first letter
  result = result.charAt(0).toUpperCase() + result.slice(1);

  return result + ' francs CFA';
}

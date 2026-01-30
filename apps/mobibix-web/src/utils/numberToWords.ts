/**
 * Convert a number to Indian Rupees words format
 * Example: 1234.56 => "Rupees One Thousand Two Hundred Thirty Four and Fifty Six Paise Only"
 */

const ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
];
const tens = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];
const teens = [
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

function convertTwoDigits(num: number): string {
  if (num === 0) return "";
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  const digit1 = Math.floor(num / 10);
  const digit2 = num % 10;
  return tens[digit1] + (digit2 !== 0 ? " " + ones[digit2] : "");
}

function convertHundreds(num: number): string {
  let result = "";
  const digit = Math.floor(num / 100);
  if (digit !== 0) {
    result += ones[digit] + " Hundred";
  }
  const remainder = num % 100;
  if (remainder !== 0) {
    result += (result ? " " : "") + convertTwoDigits(remainder);
  }
  return result;
}

export function numberToIndianWords(amount: number): string {
  // Handle zero
  if (amount === 0) return "Rupees Zero Only";

  // Handle negative
  const isNegative = amount < 0;
  amount = Math.abs(amount);

  // Split into rupees and paise
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  let words = isNegative ? "Minus " : "";

  // Convert rupees
  if (rupees === 0) {
    words += "Zero";
  } else if (rupees < 100) {
    words += convertTwoDigits(rupees);
  } else if (rupees < 1000) {
    words += convertHundreds(rupees);
  } else if (rupees < 100000) {
    const thousands = Math.floor(rupees / 1000);
    const remainder = rupees % 1000;
    words += convertTwoDigits(thousands) + " Thousand";
    if (remainder !== 0) {
      words += " " + convertHundreds(remainder);
    }
  } else if (rupees < 10000000) {
    const lakhs = Math.floor(rupees / 100000);
    const remainder = rupees % 100000;
    words += convertTwoDigits(lakhs) + " Lakh";
    if (remainder !== 0) {
      if (remainder < 1000) {
        words += " " + convertHundreds(remainder);
      } else {
        const thousands = Math.floor(remainder / 1000);
        const finalRemainder = remainder % 1000;
        words += " " + convertTwoDigits(thousands) + " Thousand";
        if (finalRemainder !== 0) {
          words += " " + convertHundreds(finalRemainder);
        }
      }
    }
  } else {
    const crores = Math.floor(rupees / 10000000);
    const remainder = rupees % 10000000;
    words += convertTwoDigits(crores) + " Crore";
    if (remainder !== 0) {
      if (remainder < 100000) {
        if (remainder < 1000) {
          words += " " + convertHundreds(remainder);
        } else {
          const thousands = Math.floor(remainder / 1000);
          const finalRemainder = remainder % 1000;
          words += " " + convertTwoDigits(thousands) + " Thousand";
          if (finalRemainder !== 0) {
            words += " " + convertHundreds(finalRemainder);
          }
        }
      } else {
        const lakhs = Math.floor(remainder / 100000);
        const afterLakhs = remainder % 100000;
        words += " " + convertTwoDigits(lakhs) + " Lakh";
        if (afterLakhs !== 0) {
          if (afterLakhs < 1000) {
            words += " " + convertHundreds(afterLakhs);
          } else {
            const thousands = Math.floor(afterLakhs / 1000);
            const finalRemainder = afterLakhs % 1000;
            words += " " + convertTwoDigits(thousands) + " Thousand";
            if (finalRemainder !== 0) {
              words += " " + convertHundreds(finalRemainder);
            }
          }
        }
      }
    }
  }

  words += " Rupees";

  // Add paise if any
  if (paise > 0) {
    words += " and " + convertTwoDigits(paise) + " Paise";
  }

  words += " Only";

  return words;
}

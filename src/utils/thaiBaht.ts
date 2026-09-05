/**
 * Converts a numeric amount into Thai Baht text string (e.g. 15,200.00 -> "หนึ่งหมื่นห้าพันสองร้อยบาทถ้วน")
 */
export function thaiBahtText(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'ศูนย์บาทถ้วน';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const bahtDigits = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const bahtUnits = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  // Split integer and decimal parts
  const formatted = absAmount.toFixed(2);
  const [intPartStr, decPartStr] = formatted.split('.');

  const convertGroup = (numStr: string): string => {
    let result = '';
    const len = numStr.length;

    for (let i = 0; i < len; i++) {
      const digit = parseInt(numStr.charAt(i), 10);
      const unitIndex = len - i - 1;

      if (digit !== 0) {
        if (unitIndex === 1 && digit === 1) {
          result += '';
        } else if (unitIndex === 1 && digit === 2) {
          result += 'ยี่';
        } else if (unitIndex === 0 && digit === 1 && len > 1 && numStr.charAt(len - 2) !== '0') {
          result += 'เอ็ด';
        } else {
          result += bahtDigits[digit];
        }
        result += bahtUnits[unitIndex];
      }
    }

    return result;
  };

  let intText = '';
  // Handle numbers larger than a million
  if (intPartStr.length > 6) {
    const millionPart = intPartStr.slice(0, -6);
    const remainderPart = intPartStr.slice(-6);
    intText = convertGroup(millionPart) + 'ล้าน' + convertGroup(remainderPart);
  } else {
    intText = convertGroup(intPartStr);
  }

  const decPartNum = parseInt(decPartStr, 10);
  let decText = '';

  if (decPartNum > 0) {
    decText = convertGroup(decPartStr) + 'สตางค์';
  } else {
    decText = 'ถ้วน';
  }

  const fullText = (isNegative ? 'ลบ' : '') + (intText ? `${intText}บาท` : '') + decText;
  return fullText;
}

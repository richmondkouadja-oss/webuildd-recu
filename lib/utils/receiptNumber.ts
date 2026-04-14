export function generateReceiptNumber(sequenceNumber: number): string {
  const year = new Date().getFullYear();
  const padded = String(sequenceNumber).padStart(5, '0');
  return `WFI-${year}-${padded}`;
}

/**
 * Generate a Venmo deep link for payment
 */
export function generateVenmoLink(
  recipientUsername: string,
  amount: number,
  note: string
): string {
  const encodedNote = encodeURIComponent(note);
  return `venmo://paycharge?txn=charge&recipients=${recipientUsername}&amount=${amount}&note=${encodedNote}`;
}

/**
 * Generate a payment note for a game instance
 */
export function generatePaymentNote(
  gameName: string,
  gameDate: Date
): string {
  const formattedDate = gameDate.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
  });
  return `${gameName} ${formattedDate}`;
}
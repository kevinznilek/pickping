/**
 * SMS response parsing utilities
 */

export interface ParsedSMSResponse {
  type: 'confirmation' | 'decline' | 'unknown';
  confidence: number; // 0-1, how confident we are in the parsing
}

/**
 * Parse an SMS response to determine intent
 */
export function parseSMSResponse(message: string): ParsedSMSResponse {
  const cleaned = message.toLowerCase().trim();

  // Exact matches (high confidence)
  if (cleaned === 'yes' || cleaned === 'y') {
    return { type: 'confirmation', confidence: 1.0 };
  }

  if (cleaned === 'no' || cleaned === 'n') {
    return { type: 'decline', confidence: 1.0 };
  }

  // Common variations (medium-high confidence)
  const confirmationPatterns = [
    /^(yes|yep|yeah|yup|sure|ok|okay|confirm|confirmed|in|i'm in|count me in)$/,
    /^(👍|✅|✓)$/,
  ];

  const declinePatterns = [
    /^(no|nope|nah|sorry|can't|cannot|out|i'm out|count me out|skip|pass)$/,
    /^(👎|❌|✗)$/,
  ];

  for (const pattern of confirmationPatterns) {
    if (pattern.test(cleaned)) {
      return { type: 'confirmation', confidence: 0.8 };
    }
  }

  for (const pattern of declinePatterns) {
    if (pattern.test(cleaned)) {
      return { type: 'decline', confidence: 0.8 };
    }
  }

  // Fuzzy matching for longer messages (lower confidence)
  if (cleaned.includes('yes') || cleaned.includes('i\'ll be there') || cleaned.includes('count me in')) {
    return { type: 'confirmation', confidence: 0.6 };
  }

  if (cleaned.includes('no') || cleaned.includes('can\'t make it') || cleaned.includes('count me out')) {
    return { type: 'decline', confidence: 0.6 };
  }

  // Unknown intent
  return { type: 'unknown', confidence: 0 };
}

/**
 * Generate a clarification message when response is unclear
 */
export function generateClarificationMessage(originalMessage: string): string {
  return `I didn't understand "${originalMessage}". Please reply YES if you're in or NO if you can't make it.`;
}

/**
 * Check if a phone number format is valid
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');

  // Should be 10 digits (US) or 11 digits with country code
  return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'));
}

/**
 * Normalize phone number to E.164 format
 */
export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  } else {
    throw new Error('Invalid phone number format');
  }
}
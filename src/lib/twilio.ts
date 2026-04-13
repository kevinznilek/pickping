import twilio from 'twilio';

let client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      throw new Error('Missing Twilio environment variables');
    }

    client = twilio(accountSid, authToken);
  }
  return client;
}

export async function sendSMS(to: string, body: string) {
  try {
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!phoneNumber) {
      throw new Error('Missing TWILIO_PHONE_NUMBER environment variable');
    }

    const twilioClient = getClient();
    const message = await twilioClient.messages.create({
      body,
      from: phoneNumber,
      to,
    });
    console.log(`SMS sent to ${to}: ${message.sid}`);
    return message;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    throw error;
  }
}

export function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');

  // Add +1 if it's a US number without country code
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  // Add + if it starts with a country code
  if (cleaned.length > 10 && !cleaned.startsWith('+')) {
    return `+${cleaned}`;
  }

  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}
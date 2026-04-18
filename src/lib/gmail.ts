import { google } from 'googleapis';
import { db } from './db';

// Gmail OAuth scopes - minimal permissions for reading emails
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

// Create OAuth2 client
export function createOAuth2Client() {
  // Fall back to constructing the redirect URI from NEXTAUTH_URL if GOOGLE_REDIRECT_URI isn't set
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`;

  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

// Generate OAuth consent URL
export function getAuthUrl(organizerId: string) {
  const oauth2Client = createOAuth2Client();
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent to ensure refresh token
    state: organizerId, // Pass organizer ID via state parameter
  });
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string, organizerId: string) {
  const oauth2Client = createOAuth2Client();
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // Store tokens in database
    await db.organizer.update({
      where: { id: organizerId },
      data: {
        gmail_access_token: tokens.access_token!,
        gmail_refresh_token: tokens.refresh_token!,
        gmail_token_expires: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        gmail_connected_at: new Date(),
      },
    });
    
    return tokens;
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw error;
  }
}

// Get Gmail client for organizer
export async function getGmailClient(organizerId: string) {
  const organizer = await db.organizer.findUnique({
    where: { id: organizerId },
  });
  
  if (!organizer?.gmail_access_token) {
    throw new Error('Organizer not connected to Gmail');
  }
  
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: organizer.gmail_access_token,
    refresh_token: organizer.gmail_refresh_token,
    expiry_date: organizer.gmail_token_expires?.getTime(),
  });
  
  // Auto-refresh tokens if needed
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await db.organizer.update({
        where: { id: organizerId },
        data: {
          gmail_access_token: tokens.access_token!,
          gmail_refresh_token: tokens.refresh_token,
          gmail_token_expires: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        },
      });
    }
  });
  
  return google.gmail({ version: 'v1', auth: oauth2Client });
}

// Search for emails from specific senders
export async function searchEmails(gmail: any, query: string, maxResults: number = 50) {
  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults,
    });
    
    return response.data.messages || [];
  } catch (error) {
    console.error('Error searching emails:', error);
    throw error;
  }
}

// Get email details
export async function getEmailDetails(gmail: any, messageId: string) {
  try {
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting email details:', error);
    throw error;
  }
}
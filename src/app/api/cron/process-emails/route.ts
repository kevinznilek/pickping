import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getGmailClient, searchEmails, getEmailDetails } from '@/lib/gmail';
import { parseVenmoEmail, matchPaymentToGame, parseYourCourtsEmail, createGameFromBooking } from '@/lib/email-parsers';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const results = {
      organizersProcessed: 0,
      venmoPaymentsFound: 0,
      venmoPaymentsMatched: 0,
      courtBookingsFound: 0,
      gamesCreated: 0,
      errors: [] as string[],
    };
    
    // Get all organizers with Gmail connected
    const organizers = await db.organizer.findMany({
      where: {
        gmail_access_token: { not: null },
      },
    });
    
    for (const organizer of organizers) {
      try {
        results.organizersProcessed++;
        
        // Get Gmail client for this organizer
        const gmail = await getGmailClient(organizer.id);
        
        // Process Venmo payments (last 7 days)
        await processVenmoEmails(gmail, organizer.id, results);
        
        // Process YourCourts bookings (last 30 days)
        await processYourCourtsEmails(gmail, organizer.id, results);
        
      } catch (error) {
        console.error(`Error processing emails for organizer ${organizer.id}:`, error);
        results.errors.push(`Organizer ${organizer.email}: ${error}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error) {
    console.error('Email processing cron error:', error);
    return NextResponse.json(
      { error: 'Email processing failed', details: error },
      { status: 500 }
    );
  }
}

async function processVenmoEmails(gmail: any, organizerId: string, results: any) {
  // Search for Venmo payment emails from last 7 days
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const dateQuery = `after:${oneWeekAgo.getFullYear()}/${oneWeekAgo.getMonth() + 1}/${oneWeekAgo.getDate()}`;
  const venmoQuery = `from:venmo@venmo.com subject:"You received" ${dateQuery}`;
  
  const messages = await searchEmails(gmail, venmoQuery, 50);
  
  for (const message of messages) {
    try {
      const emailDetails = await getEmailDetails(gmail, message.id);
      
      // Extract subject and body
      const subject = emailDetails.payload.headers.find(
        (h: any) => h.name === 'Subject'
      )?.value || '';
      
      let body = '';
      if (emailDetails.payload.body?.data) {
        body = Buffer.from(emailDetails.payload.body.data, 'base64').toString();
      } else if (emailDetails.payload.parts) {
        // Multi-part message, look for text/plain
        const textPart = emailDetails.payload.parts.find((part: any) => 
          part.mimeType === 'text/plain'
        );
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString();
        }
      }
      
      // Parse Venmo payment
      const payment = parseVenmoEmail(body, subject);
      if (payment) {
        results.venmoPaymentsFound++;
        
        // Try to match to game confirmation
        const matchResult = await matchPaymentToGame(payment, organizerId);
        if (matchResult.matched) {
          results.venmoPaymentsMatched++;
          console.log(`✅ Matched payment: ${payment.playerName} - $${payment.amount}`);
        }
      }
    } catch (error) {
      console.error(`Error processing Venmo email ${message.id}:`, error);
    }
  }
}

async function processYourCourtsEmails(gmail: any, organizerId: string, results: any) {
  // Search for YourCourts booking confirmations from last 30 days
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const dateQuery = `after:${oneMonthAgo.getFullYear()}/${oneMonthAgo.getMonth() + 1}/${oneMonthAgo.getDate()}`;
  const courtsQuery = `subject:"Booking Confirmation" ${dateQuery}`;
  
  const messages = await searchEmails(gmail, courtsQuery, 20);
  
  for (const message of messages) {
    try {
      const emailDetails = await getEmailDetails(gmail, message.id);
      
      // Extract subject and body
      const subject = emailDetails.payload.headers.find(
        (h: any) => h.name === 'Subject'
      )?.value || '';
      
      let body = '';
      if (emailDetails.payload.body?.data) {
        body = Buffer.from(emailDetails.payload.body.data, 'base64').toString();
      } else if (emailDetails.payload.parts) {
        const textPart = emailDetails.payload.parts.find((part: any) => 
          part.mimeType === 'text/plain'
        );
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString();
        }
      }
      
      // Parse court booking
      const booking = parseYourCourtsEmail(body, subject);
      if (booking) {
        results.courtBookingsFound++;
        
        // Create game from booking
        const createResult = await createGameFromBooking(booking, organizerId);
        if (createResult.created) {
          results.gamesCreated++;
          console.log(`✅ Created game: ${booking.venue} - ${booking.date.toLocaleDateString()}`);
        }
      }
    } catch (error) {
      console.error(`Error processing YourCourts email ${message.id}:`, error);
    }
  }
}

// Allow GET for testing
export async function GET() {
  return NextResponse.json({
    message: 'Email processing cron endpoint',
    usage: 'POST with Bearer token authentication',
  });
}
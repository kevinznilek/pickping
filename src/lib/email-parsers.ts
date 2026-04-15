import { db } from './db';
import { PaymentStatus } from '@prisma/client';

// Parse Venmo payment emails
export interface VenmoPayment {
  amount: number;
  playerName: string;
  note: string;
  date: Date;
}

export function parseVenmoEmail(emailBody: string, subject: string): VenmoPayment | null {
  try {
    // Venmo email patterns:
    // Subject: "You received $15.00 from John Smith"
    // Body contains: note/memo for the payment
    
    const amountMatch = subject.match(/You received \$(\d+\.?\d*) from (.+)/);
    if (!amountMatch) return null;
    
    const amount = parseFloat(amountMatch[1]);
    const playerName = amountMatch[2].trim();
    
    // Extract note from email body
    // Look for common patterns in Venmo emails
    let note = '';
    const notePatterns = [
      /for "([^"]+)"/i,
      /memo: (.+?)$/mi,
      /note: (.+?)$/mi,
      /payment for (.+?)$/mi,
    ];
    
    for (const pattern of notePatterns) {
      const match = emailBody.match(pattern);
      if (match) {
        note = match[1].trim();
        break;
      }
    }
    
    return {
      amount,
      playerName,
      note,
      date: new Date(),
    };
  } catch (error) {
    console.error('Error parsing Venmo email:', error);
    return null;
  }
}

// Match Venmo payment to game confirmation
export async function matchPaymentToGame(payment: VenmoPayment, organizerId: string) {
  try {
    // Find recent game instances (last 7 days) for this organizer
    const recentInstances = await db.gameInstance.findMany({
      where: {
        game: {
          organizer_id: organizerId,
        },
        date: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      include: {
        game_confirmations: {
          include: {
            player: true,
          },
        },
        game: true,
      },
    });
    
    // Multi-signal matching logic
    for (const instance of recentInstances) {
      for (const confirmation of instance.game_confirmations) {
        const player = confirmation.player;
        
        // Check if payment matches this confirmation
        const signals = {
          nameMatch: isNameMatch(payment.playerName, player.name),
          amountMatch: Math.abs(payment.amount - Number(instance.game.cost_per_player || 0)) < 0.01,
          noteMatch: isNoteMatch(payment.note, instance.game.name, instance.date),
          timingMatch: isWithinPaymentWindow(payment.date, instance.date),
        };
        
        // Require at least 3 out of 4 signals to match
        const matchScore = Object.values(signals).filter(Boolean).length;
        
        if (matchScore >= 3) {
          // Mark as paid
          await db.gameConfirmation.update({
            where: { id: confirmation.id },
            data: {
              payment_status: PaymentStatus.PAID,
              paid_at: payment.date,
            },
          });
          
          return {
            matched: true,
            gameInstance: instance,
            player: player,
            confirmation: confirmation,
            matchScore,
            signals,
          };
        }
      }
    }
    
    return { matched: false };
  } catch (error) {
    console.error('Error matching payment to game:', error);
    return { matched: false };
  }
}

// Helper functions for payment matching
function isNameMatch(paymentName: string, playerName: string): boolean {
  const normalize = (name: string) => name.toLowerCase().replace(/[^a-z]/g, '');
  const normalizedPayment = normalize(paymentName);
  const normalizedPlayer = normalize(playerName);
  
  // Exact match or first/last name partial match
  if (normalizedPayment === normalizedPlayer) return true;
  
  const paymentParts = paymentName.toLowerCase().split(' ');
  const playerParts = playerName.toLowerCase().split(' ');
  
  // Check if first and last names appear in either order
  return paymentParts.some(part => playerParts.includes(part)) &&
         paymentParts.length >= 2 && playerParts.length >= 2;
}

function isNoteMatch(note: string, gameName: string, gameDate: Date): boolean {
  const normalizeNote = note.toLowerCase();
  const normalizeGame = gameName.toLowerCase();
  
  // Check if game name appears in note
  if (normalizeNote.includes(normalizeGame)) return true;
  
  // Check if date appears in note (various formats)
  const dateString = gameDate.toLocaleDateString();
  const shortDate = `${gameDate.getMonth() + 1}/${gameDate.getDate()}`;
  
  return normalizeNote.includes(dateString) || normalizeNote.includes(shortDate);
}

function isWithinPaymentWindow(paymentDate: Date, gameDate: Date): boolean {
  const timeDiff = paymentDate.getTime() - gameDate.getTime();
  const hoursDiff = timeDiff / (1000 * 60 * 60);
  
  // Payment should be within 7 days before to 3 days after the game
  return hoursDiff >= -7 * 24 && hoursDiff <= 3 * 24;
}

// Parse YourCourts booking emails  
export interface CourtBooking {
  venue: string;
  date: Date;
  startTime: string;
  endTime: string;
  court: string;
}

export function parseYourCourtsEmail(emailBody: string, subject: string): CourtBooking | null {
  try {
    // YourCourts email patterns vary, but typically include:
    // Subject: "Booking Confirmation - [Venue Name]"
    // Body: Date/time information
    
    // Extract venue from subject
    const venueMatch = subject.match(/Booking Confirmation - (.+)/);
    if (!venueMatch) return null;
    
    const venue = venueMatch[1].trim();
    
    // Look for date/time patterns in email body
    const dateTimePatterns = [
      /(\w+day),\s*(\w+)\s*(\d+),?\s*(\d{4})\s*at\s*(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})\s*from\s*(\d{1,2}:\d{2}\s*[AP]M)\s*to\s*(\d{1,2}:\d{2}\s*[AP]M)/i,
    ];
    
    for (const pattern of dateTimePatterns) {
      const match = emailBody.match(pattern);
      if (match) {
        // Parse the matched date/time
        let date: Date;
        let startTime: string;
        let endTime: string;
        
        if (pattern === dateTimePatterns[0]) {
          // Format: "Wednesday, April 16, 2026 at 6:00 PM - 8:00 PM"
          const dateStr = `${match[2]} ${match[3]}, ${match[4]}`;
          date = new Date(dateStr);
          startTime = match[5];
          endTime = match[6];
        } else {
          // Format: "4/16/2026 from 6:00 PM to 8:00 PM"
          date = new Date(match[1]);
          startTime = match[2];
          endTime = match[3];
        }
        
        // Extract court information
        const courtMatch = emailBody.match(/Court\s*(?:Number\s*)?[:#]?\s*(\d+|[A-Z])/i);
        const court = courtMatch ? `Court ${courtMatch[1]}` : 'Court 1';
        
        return {
          venue,
          date,
          startTime,
          endTime,
          court,
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing YourCourts email:', error);
    return null;
  }
}

// Create game from court booking
export async function createGameFromBooking(booking: CourtBooking, organizerId: string) {
  try {
    // Check if game already exists for this date/venue
    const existingGame = await db.game.findFirst({
      where: {
        organizer_id: organizerId,
        name: {
          contains: booking.venue,
        },
        game_instances: {
          some: {
            date: {
              gte: new Date(booking.date.getFullYear(), booking.date.getMonth(), booking.date.getDate()),
              lt: new Date(booking.date.getFullYear(), booking.date.getMonth(), booking.date.getDate() + 1),
            },
          },
        },
      },
    });
    
    if (existingGame) {
      return { created: false, reason: 'Game already exists for this date/venue' };
    }
    
    // Create new game
    const game = await db.game.create({
      data: {
        name: `${booking.venue} - ${booking.court}`,
        location: booking.venue,
        day_of_week: booking.date.getDay(),
        time: booking.startTime,
        total_spots: 8, // Default for pickleball
        cost_per_player: 15.00, // Default cost
        is_recurring: true,
        organizer_id: organizerId,
      },
    });
    
    // Create game instance for the booking date/time
    const gameInstance = await db.gameInstance.create({
      data: {
        game_id: game.id,
        date: booking.date,
      },
    });
    
    return {
      created: true,
      game,
      gameInstance,
      booking,
    };
  } catch (error) {
    console.error('Error creating game from booking:', error);
    return { created: false, reason: 'Database error' };
  }
}
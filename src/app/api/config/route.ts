import { NextResponse } from 'next/server'

// Masque une clé : affiche les 6 premiers et 4 derniers caractères
function mask(value: string | undefined): { configured: boolean; masked: string } {
  if (!value) return { configured: false, masked: '' }
  if (value.length <= 10) return { configured: true, masked: '••••••••' }
  return {
    configured: true,
    masked: `${value.slice(0, 6)}${'•'.repeat(Math.min(value.length - 10, 20))}${value.slice(-4)}`,
  }
}

export async function GET() {
  return NextResponse.json({
    brevo: {
      apiKey: mask(process.env.BREVO_API_KEY),
      senderEmail: process.env.BREVO_SENDER_EMAIL ?? '',
      senderName: process.env.BREVO_SENDER_NAME ?? '',
    },
    sms: {
      senderId: process.env.TWILIO_SENDER_ID ?? 'Solargeo',
    },
    whatsapp: {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
      accessToken: mask(process.env.WHATSAPP_ACCESS_TOKEN),
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN ?? '',
    },
  })
}

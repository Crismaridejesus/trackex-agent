import { NextRequest, NextResponse } from "next/server"

const TELEGRAM_BOT_TOKEN = "8049148411:AAGhkHcCJhMMntKJebBPSEs8zS5hiQfSkiY"
const TELEGRAM_CHAT_ID = "1366090419"

export async function POST(request: NextRequest) {
  try {
    const { name, email, company, message } = await request.json()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Format message for Telegram
    const telegramMessage = `
🔔 *New Contact Form Submission*

👤 *Name:* ${name}
📧 *Email:* ${email}
🏢 *Company:* ${company || "Not provided"}

💬 *Message:*
${message}
    `.trim()

    // Send to Telegram
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: telegramMessage,
          parse_mode: "Markdown",
        }),
      }
    )

    if (!telegramResponse.ok) {
      const error = await telegramResponse.json()
      console.error("Telegram API error:", error)
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Contact form error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}


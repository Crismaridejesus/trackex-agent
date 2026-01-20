import { logAuditEvent } from "@/lib/audit/logger"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

interface LoginRateLimit {
  attempts: number
  resetTime: number
  blocked: boolean
  blockUntil: number
}

const loginRateLimits = new Map<string, LoginRateLimit>()
const MAX_LOGIN_ATTEMPTS = 10 // 10 failed attempts per email
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
const BLOCK_DURATION = 30 * 60 * 1000 // 30 minute block after max attempts

function checkLoginRateLimit(email: string): {
  allowed: boolean
  reason?: string
} {
  const now = Date.now()
  const key = email.toLowerCase()
  const limit = loginRateLimits.get(key)

  if (process.env.NODE_ENV === "development") {
    return { allowed: true }
  }

  // Initialize or reset if window expired
  if (!limit || now > limit.resetTime) {
    loginRateLimits.set(key, {
      attempts: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
      blocked: false,
      blockUntil: 0,
    })
    return { allowed: true }
  }

  // Check if currently blocked
  if (limit.blocked && now < limit.blockUntil) {
    const remainingMinutes = Math.ceil((limit.blockUntil - now) / 60000)
    console.warn(
      `Login blocked for ${email}. ${remainingMinutes} minutes remaining.`
    )
    return {
      allowed: false,
      reason: `Too many failed login attempts. Please try again in ${remainingMinutes} minutes.`,
    }
  }

  // Reset if block expired
  if (limit.blocked && now >= limit.blockUntil) {
    limit.attempts = 1
    limit.blocked = false
    limit.resetTime = now + RATE_LIMIT_WINDOW
    return { allowed: true }
  }

  // Check attempts
  if (limit.attempts >= MAX_LOGIN_ATTEMPTS) {
    limit.blocked = true
    limit.blockUntil = now + BLOCK_DURATION
    console.warn(
      `Login rate limit exceeded for ${email}. Blocking for 30 minutes.`
    )
    return {
      allowed: false,
      reason: "Too many failed login attempts. Please try again in 30 minutes.",
    }
  }

  // Increment and allow
  limit.attempts++
  return { allowed: true }
}

function resetLoginRateLimit(email: string) {
  loginRateLimits.delete(email.toLowerCase())
}

// Cleanup old entries on-demand (probabilistic cleanup)
// This avoids setInterval memory leaks in serverless environments
function cleanupLoginRateLimits() {
  // Only cleanup 1% of requests to minimize overhead
  if (Math.random() < 0.01) {
    const now = Date.now()
    let cleaned = 0
    for (const [email, limit] of loginRateLimits.entries()) {
      if (now > limit.resetTime + RATE_LIMIT_WINDOW) {
        loginRateLimits.delete(email)
        cleaned++
      }
    }
    if (cleaned > 0) {
      console.log(
        `Login rate limit cleanup: removed ${cleaned} expired entries`
      )
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    // Cleanup old rate limit entries on-demand
    cleanupLoginRateLimits()

    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // Check rate limit
    const rateLimitCheck = checkLoginRateLimit(email)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: rateLimitCheck.reason || "Too many attempts" },
        { status: 429 }
      )
    }

    // Find employee by email (case-insensitive)
    const employee = await prisma.employee.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
        isActive: true,
      },
      include: {
        team: true,
        policy: true,
        organization: true,
        license: true,
      },
    })

    if (!employee) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Check if employee has a password set
    if (!employee.password) {
      return NextResponse.json(
        {
          error:
            "No password set for this employee. Contact your administrator.",
        },
        { status: 401 }
      )
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, employee.password)

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }

    // Login successful - reset rate limit
    resetLoginRateLimit(email)

    // Log successful login
    // Note: License validation moved to device registration endpoint
    // This allows employees to authenticate first, then verify license during device registration
    await logAuditEvent(
      {
        action: "employee_login",
        organizationId: employee.organizationId,
        targetType: "Employee",
        targetId: employee.id,
        details: JSON.stringify({
          email: employee.email,
          loginMethod: "desktop_app",
          success: true,
          userAgent: req.headers.get("user-agent") || "unknown",
        }),
      },
      req
    )

    // Return employee data for the desktop app
    return NextResponse.json({
      success: true,
      employee: {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        team: employee.team,
        policy: employee.policy,
        autoScreenshots: employee.autoScreenshots,
        screenshotInterval: employee.screenshotInterval,
        organizationId: employee.organizationId || null,
        organizationName: employee.organization?.name || "Unknown",
      },
    })
  } catch (error) {
    console.error("Employee login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}

import { logAuditEvent } from "@/lib/audit/logger";
import { createSimpleSession, verifyCredentials } from "@/lib/simple-auth";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    let body
    try {
      body = await req.json()
    } catch (parseError) {
      console.error("Simple login error:", parseError)
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      )
    }

    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    // verifyCredentials now returns SessionUser or null
    const user = await verifyCredentials(email, password)

    if (user) {
      const session = createSimpleSession(user)

      // Set session cookie
      cookies().set("simple-session", JSON.stringify(session), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60, // 24 hours
      })

      // Log the login
      try {
        await logAuditEvent(
          {
            action: "user_login" as any,
            organizationId: user.organizationId || "NONE",
            targetType: "User",
            targetId: user.id,
            details: JSON.stringify({
              email: user.email,
              organizationId: user.organizationId,
              organizationRole: user.organizationRole,
              platformRole: user.role,
            }),
          },
          req
        )
      } catch (auditError) {
        console.warn("Failed to log login audit event:", auditError)
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          organizationId: user.organizationId,
          organizationRole: user.organizationRole,
          organizationName: user.organizationName,
        },
      })
    } else {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error("Simple login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}

import { logAuditEvent } from "@/lib/audit/logger"
import { prisma } from "@/lib/db"
import { hashPassword } from "@/lib/password"
import { registrationApiSchema } from "@/lib/validations/registration"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50)
}

async function generateUniqueSlug(baseName: string): Promise<string> {
  const baseSlug = generateSlug(baseName)
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await prisma.organization.findUnique({
      where: { slug },
      select: { id: true },
    })

    if (!existing) {
      return slug
    }

    slug = `${baseSlug}-${counter}`
    counter++

    // Prevent infinite loop
    if (counter > 100) {
      slug = `${baseSlug}-${Date.now()}`
      break
    }
  }

  return slug
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate input
    const validationResult = registrationApiSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.errors,
        },
        { status: 400 }
      )
    }

    const {
      fullName,
      email,
      password,
      companyName,
      companySize,
      industry,
      timezone,
    } = validationResult.data

    // Check if user with this email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      )
    }

    // Check if organization with this email already exists
    const existingOrg = await prisma.organization.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
      },
    })

    if (existingOrg) {
      return NextResponse.json(
        { error: "An organization with this email already exists" },
        { status: 409 }
      )
    }

    // Generate unique slug for organization
    const slug = await generateUniqueSlug(companyName)

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user, organization, and link them in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: {
          email,
          name: fullName,
          password: hashedPassword,
          role: "USER", // Platform role, org role is in OrganizationUser
          isActive: true,
        },
      })

      // Create the organization
      const organization = await tx.organization.create({
        data: {
          name: companyName,
          slug,
          email,
          companySize,
          industry,
          timezone: timezone || "UTC",
          isBetaTester: false,
          bypassPayment: false,

          isActive: true,
        },
      })

      // Link user to organization as OWNER
      const orgUser = await tx.organizationUser.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: "OWNER",
          teamIds: [],
          isActive: true,
        },
      })

      // Create a default policy for the organization
      await tx.policy.create({
        data: {
          organizationId: organization.id,
          name: "Default Policy",
          idleThresholdS: 120,
          countIdleAsWork: false,
          autoScreenshots: false,
          redactTitles: false,
          browserDomainOnly: true,
          isDefault: true,
        },
      })

      return { user, organization, orgUser }
    })

    // Log the registration
    try {
      await logAuditEvent(
        {
          action: "organization_create" as any,
          organizationId: result.organization.id,
          targetType: "Organization",
          targetId: result.organization.id,
          details: JSON.stringify({
            organizationName: result.organization.name,
            ownerEmail: result.user.email,
            companySize,
          }),
        },
        req
      )
    } catch (auditError) {
      console.warn("Failed to log registration audit event:", auditError)
    }

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
        },
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { authenticateDevice } from '@/lib/auth/device';

/**
 * GET /api/auth/validate
 *
 * Lightweight endpoint to validate device tokens without full authentication flow.
 * Used by desktop agents on startup to check if stored tokens are still valid.
 *
 * Returns:
 * - 200 OK: Token is valid
 * - 401 Unauthorized: Token is invalid/expired
 */
export async function GET(request: NextRequest) {
  try {
    // Validate the token using existing auth logic
    const deviceAuth = await authenticateDevice(request);

    // Token is valid
    return NextResponse.json(
      {
        valid: true,
        device_id: deviceAuth.device.id,
        email: deviceAuth.device.employee.email,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[Auth Validate] Error validating token:', error);

    // Token is invalid or authentication failed
    return NextResponse.json(
      {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid device token'
      },
      { status: 401 }
    );
  }
}

/**
 * POST /api/auth/validate
 *
 * Alternative endpoint that accepts token in request body.
 * Useful for clients that prefer POST over GET with headers.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = body.token;

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Token is required' },
        { status: 401 }
      );
    }

    // Create a new request with the token in the Authorization header
    const headers = new Headers(request.headers);
    headers.set('Authorization', `Bearer ${token}`);

    const validationRequest = new NextRequest(request.url, {
      headers,
    });

    // Validate the token using existing auth logic
    const deviceAuth = await authenticateDevice(validationRequest);

    // Token is valid
    return NextResponse.json(
      {
        valid: true,
        device_id: deviceAuth.device.id,
        email: deviceAuth.device.employee.email,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('[Auth Validate] Error validating token:', error);

    // Token is invalid or authentication failed
    return NextResponse.json(
      {
        valid: false,
        error: error instanceof Error ? error.message : 'Invalid device token'
      },
      { status: 401 }
    );
  }
}

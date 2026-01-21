import { csrfFailureResponse, ensureCsrfCookie, validateCsrfToken } from '@/lib/csrf';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Server-side code storage with TTL (5 minutes)
const wipeCodeStore = new Map<string, { code: string; expires: number }>();
const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function generateConfirmationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function cleanExpiredCodes() {
    const now = Date.now();
    for (const [key, value] of wipeCodeStore.entries()) {
        if (value.expires < now) {
            wipeCodeStore.delete(key);
        }
    }
}

// GET /api/settings/wipe - Generate a confirmation code (server-side)
export async function GET() {
    try {
        const csrfToken = await ensureCsrfCookie();
        cleanExpiredCodes();

        const code = generateConfirmationCode();
        wipeCodeStore.set(csrfToken, {
            code,
            expires: Date.now() + CODE_TTL_MS,
        });

        return NextResponse.json({ code });
    } catch (error) {
        console.error('Generate wipe code error:', error);
        return NextResponse.json(
            { error: 'Failed to generate confirmation code' },
            { status: 500 }
        );
    }
}

// DELETE /api/settings/wipe - Wipe all data from the database
export async function DELETE(request: NextRequest) {
    if (!(await validateCsrfToken(request))) {
        return csrfFailureResponse();
    }

    try {
        // Get the CSRF token to look up the stored code
        const csrfToken = request.headers.get('x-csrf-token') || '';

        // Get confirmation code from request body (only user's input, not expected)
        const body = await request.json().catch(() => ({}));
        const { confirmationCode } = body;

        if (!confirmationCode) {
            return NextResponse.json(
                { error: 'Confirmation code required' },
                { status: 400 }
            );
        }

        // Validate against server-stored code
        const stored = wipeCodeStore.get(csrfToken);
        if (!stored) {
            return NextResponse.json(
                { error: 'No confirmation code issued. Please try again.' },
                { status: 400 }
            );
        }

        if (stored.expires < Date.now()) {
            wipeCodeStore.delete(csrfToken);
            return NextResponse.json(
                { error: 'Confirmation code expired. Please try again.' },
                { status: 400 }
            );
        }

        // Timing-safe comparison
        const isValid =
            confirmationCode.length === stored.code.length &&
            crypto.timingSafeEqual(
                Buffer.from(confirmationCode.toUpperCase()),
                Buffer.from(stored.code)
            );

        if (!isValid) {
            return NextResponse.json(
                { error: 'Confirmation code does not match' },
                { status: 400 }
            );
        }

        // Clear the used code
        wipeCodeStore.delete(csrfToken);

        // Delete all data in order (respecting foreign key constraints)
        // Content depends on Diagram, so delete Content first
        await prisma.$transaction([
            prisma.content.deleteMany(),
            prisma.diagram.deleteMany(),
            prisma.note.deleteMany(),
            prisma.setting.deleteMany(),
        ]);

        return NextResponse.json({ success: true, message: 'All data has been wiped' });
    } catch (error) {
        console.error('Wipe database error:', error);
        return NextResponse.json(
            { error: 'Failed to wipe database' },
            { status: 500 }
        );
    }
}


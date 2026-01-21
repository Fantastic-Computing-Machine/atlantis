import { csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// DELETE /api/settings/wipe - Wipe all data from the database
export async function DELETE(request: NextRequest) {
    if (!(await validateCsrfToken(request))) {
        return csrfFailureResponse();
    }

    try {
        // Get confirmation code from request body
        const body = await request.json().catch(() => ({}));
        const { confirmationCode, expectedCode } = body;

        if (!confirmationCode || !expectedCode) {
            return NextResponse.json(
                { error: 'Confirmation code required' },
                { status: 400 }
            );
        }

        if (confirmationCode !== expectedCode) {
            return NextResponse.json(
                { error: 'Confirmation code does not match' },
                { status: 400 }
            );
        }

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

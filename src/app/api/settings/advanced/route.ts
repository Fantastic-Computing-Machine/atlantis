import { csrfFailureResponse, validateCsrfToken } from '@/lib/csrf';
import {
    getAdvancedSettings,
    setMaxCheckpoints,
    setAutoSaveDelay,
    setDefaultExportFormat,
    setExportScale,
    type ExportFormat,
    type ExportScale,
} from '@/lib/settings';
import { logApiError } from '@/lib/logger';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const settings = await getAdvancedSettings();
        return NextResponse.json(settings);
    } catch (error) {
        logApiError('GET /api/settings/advanced', error);
        return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    if (!(await validateCsrfToken(request))) {
        return csrfFailureResponse();
    }

    try {
        const body = await request.json();
        const { maxCheckpoints, autoSaveDelay, defaultExportFormat, exportScale } = body ?? {};

        if (typeof maxCheckpoints === 'number') {
            await setMaxCheckpoints(maxCheckpoints);
        }

        if (typeof autoSaveDelay === 'number') {
            await setAutoSaveDelay(autoSaveDelay);
        }

        if (defaultExportFormat && ['svg', 'png', 'pdf'].includes(defaultExportFormat)) {
            await setDefaultExportFormat(defaultExportFormat as ExportFormat);
        }

        if (typeof exportScale === 'number' && [1, 2, 3].includes(exportScale)) {
            await setExportScale(exportScale as ExportScale);
        }

        const settings = await getAdvancedSettings();
        return NextResponse.json({ success: true, ...settings });
    } catch (error) {
        logApiError('PUT /api/settings/advanced', error);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}

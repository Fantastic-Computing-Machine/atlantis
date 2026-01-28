import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdtemp, rm, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  let tempDir = '';
  try {
    const { content } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Create a temporary directory for compilation
    tempDir = await mkdtemp(join(tmpdir(), 'latex-'));
    const inputPath = join(tempDir, 'document.tex');
    const outputPath = join(tempDir, 'document.pdf');

    // Write the LaTeX content to a file
    await writeFile(inputPath, content);

    // Compile logic
    // We use pdflatex. -interaction=nonstopmode prevents hanging on errors
    // -output-directory ensures output goes to our temp dir
    const command = `pdflatex -interaction=nonstopmode -output-directory=${tempDir} ${inputPath}`;

    let stdout = '';
    let stderr = '';
    let compileError: ExecError | null = null;

    try {
      const result = await execAsync(command);
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error: unknown) {
      const execError = error as ExecError;
      compileError = execError;
      stdout = execError?.stdout ?? '';
      stderr = execError?.stderr ?? '';

      if (execError.code === 127 || execError.message?.includes('command not found')) {
        return NextResponse.json(
          {
            error: 'Server configuration error: pdflatex is not installed or not in PATH.',
            details: 'Please install TeX Live (e.g. `apt install texlive-latex-base`)',
          },
          { status: 500 }
        );
      }
    }

    const logContent = await readLogSafely(join(tempDir, 'document.log'));
    const pdfExists = await fileExists(outputPath);

    if (!pdfExists) {
      return NextResponse.json(
        {
          error: 'Compilation failed',
          log: logContent || stderr || stdout || 'No log available.',
          stdout,
          stderr,
        },
        { status: 400 }
      );
    }

    const pdfBuffer = await readFile(outputPath);

    const headers: Record<string, string> = {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="document.pdf"',
    };

    if (compileError) {
      const warningText = logContent || stderr || stdout || 'Compilation completed with warnings.';
      const snippet = buildLogSnippet(warningText);
      const summary = buildWarningSummary(snippet);

      headers['x-latex-warning'] = 'true';

      if (snippet) {
        const base64Snippet = Buffer.from(snippet).toString('base64');
        headers['x-latex-log-b64'] = base64Snippet;
      }

      if (summary) {
        headers['x-latex-warning-msg'] = sanitizeHeaderValue(summary, 400);
      }
    }

    return new NextResponse(pdfBuffer, {
      headers,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Server error during LaTeX compilation:', error);
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  } finally {
    // Cleanup temp directory
    if (tempDir) {
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.error('Failed to clean up temp dir:', e);
      }
    }
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readLogSafely(path: string): Promise<string> {
  try {
    const content = await readFile(path, 'utf-8');
    return content;
  } catch {
    return '';
  }
}

function sanitizeHeaderValue(value: string, maxLength = 1500): string {
  return value.replace(/\0/g, '').replace(/\s+/g, ' ').slice(0, maxLength);
}

type ExecError = Error & {
  code?: number;
  stdout?: string;
  stderr?: string;
};

function buildLogSnippet(log: string, maxChars = 4000): string {
  if (!log) return '';
  const normalized = log.replace(/\r\n/g, '\n');
  if (normalized.length <= maxChars) return normalized;
  return normalized.slice(normalized.length - maxChars);
}

function buildWarningSummary(log: string): string {
  if (!log) return 'Compilation completed with warnings.';
  const lines = log
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const notFound = lines.find((l) => l.includes('not found'));
  if (notFound) return notFound;
  const latexWarning = lines.find((l) => l.toLowerCase().includes('warning'));
  if (latexWarning) return latexWarning;
  return lines[0]?.slice(0, 200) ?? 'Compilation completed with warnings.';
}

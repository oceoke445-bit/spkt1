import { NextResponse } from 'next/server';
import { getDatabaseInfo } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  try {
    const info = getDatabaseInfo();

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: info.hasDemoUser ? 'ready' : 'missing-demo-users',
      dbPath: info.dbPath,
      dataDir: info.dataDir,
      userCount: info.userCount,
      demoUserActive: info.demoUserActive,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Database unavailable',
      },
      { status: 503 },
    );
  }
}

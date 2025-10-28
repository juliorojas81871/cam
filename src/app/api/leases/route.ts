import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';

export async function GET() {
  try {
    const leases = await db.select().from(schema.leases);

    return NextResponse.json({
      data: leases,
    });
  } catch (error) {
    console.error('Error fetching leases:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


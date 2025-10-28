import { NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';

export async function GET() {
  try {
    const owned = await db.select().from(schema.owned);

    return NextResponse.json({
      data: owned,
    });
  } catch (error) {
    console.error('Error fetching owned properties:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


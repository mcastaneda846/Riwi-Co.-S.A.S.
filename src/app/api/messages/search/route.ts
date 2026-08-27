import { NextResponse } from 'next/server';
import { SearchMessagesUseCase } from '@/core/use-cases/SearchMessagesUseCase';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

interface DecodedToken {
  userId: string;
}

const searchSchema = z.object({
  q: z.string().min(1)
});

export async function GET(req: Request) {
  const correlationId = req.headers.get('x-correlation-id') || `corr-${Date.now()}`;
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'x-correlation-id': correlationId } }
    );
  }

  const token = authHeader.split(' ')[1];
  let decoded: DecodedToken;
  try {
    decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_jwt_token_clan_riwi_2026'
    ) as DecodedToken;
  } catch {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401, headers: { 'x-correlation-id': correlationId } }
    );
  }

  const { searchParams } = new URL(req.url);
  const parsed = searchSchema.safeParse({ q: searchParams.get('q') });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Search query q is required' },
      { status: 400, headers: { 'x-correlation-id': correlationId } }
    );
  }

  try {
    const searchUseCase = new SearchMessagesUseCase();
    const results = await searchUseCase.execute(decoded.userId, parsed.data.q);

    return NextResponse.json(
      results,
      { status: 200, headers: { 'x-correlation-id': correlationId } }
    );
  } catch (error) {
    console.error(`[${correlationId}] Search GET error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'x-correlation-id': correlationId } }
    );
  }
}

import { NextResponse } from 'next/server';
import { CopilotRagUseCase } from '@/core/use-cases/CopilotRagUseCase';
import { z } from 'zod';
import jwt from 'jsonwebtoken';

interface DecodedToken {
  userId: string;
  fullName: string;
  role: string;
  email: string;
}

const copilotSchema = z.object({
  query: z.string().min(1)
});

export async function POST(req: Request) {
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

  try {
    const body = await req.json();
    const parsed = copilotSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Query parameters are invalid', details: parsed.error.format() },
        { status: 400, headers: { 'x-correlation-id': correlationId } }
      );
    }

    const copilotUseCase = new CopilotRagUseCase();
    const result = await copilotUseCase.execute(
      decoded.userId,
      decoded.fullName || 'User',
      decoded.role || 'user',
      decoded.email || '',
      parsed.data.query
    );

    return NextResponse.json(
      result,
      { status: 200, headers: { 'x-correlation-id': correlationId } }
    );
  } catch (error) {
    console.error(`[${correlationId}] Copilot POST error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'x-correlation-id': correlationId } }
    );
  }
}

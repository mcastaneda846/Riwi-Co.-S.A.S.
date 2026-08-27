import { NextResponse } from 'next/server';
import { LoginUseCase } from '@/core/use-cases/LoginUseCase';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const correlationId = req.headers.get('x-correlation-id') || `corr-${Date.now()}`;
  
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input parameters', details: parsed.error.format() },
        { status: 400, headers: { 'x-correlation-id': correlationId } }
      );
    }

    const loginUseCase = new LoginUseCase();
    const result = await loginUseCase.execute(parsed.data.email, parsed.data.password);

    if (!result) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401, headers: { 'x-correlation-id': correlationId } }
      );
    }

    return NextResponse.json(
      result,
      { status: 200, headers: { 'x-correlation-id': correlationId } }
    );
  } catch (error) {
    console.error(`[${correlationId}] Login API error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'x-correlation-id': correlationId } }
    );
  }
}

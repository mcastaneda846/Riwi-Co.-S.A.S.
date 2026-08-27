import { NextResponse } from 'next/server';
import { UserRepository } from '@/infrastructure/repositories/UserRepository';
import { withBypassContext } from '@/infrastructure/database/postgres';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

interface DecodedToken {
  userId: string;
}

export async function POST(req: Request) {
  const correlationId = req.headers.get('x-correlation-id') || `corr-${Date.now()}`;

  try {
    const body = await req.json();
    const parsed = refreshSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400, headers: { 'x-correlation-id': correlationId } }
      );
    }

    const { refreshToken } = parsed.data;
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_token_clan_riwi_2026';

    let decoded: DecodedToken;
    try {
      decoded = jwt.verify(refreshToken, secret) as DecodedToken;
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401, headers: { 'x-correlation-id': correlationId } }
      );
    }

    // Buscar al usuario en la base de datos (con bypass para poder validar su estado)
    const dbUser = await withBypassContext(async (client) => {
      const repo = new UserRepository(client);
      return await repo.findById(decoded.userId);
    });

    if (!dbUser || !dbUser.rw_is_active) {
      return NextResponse.json(
        { error: 'User not found or inactive' },
        { status: 401, headers: { 'x-correlation-id': correlationId } }
      );
    }

    const userPayload = {
      userId: dbUser.rw_id,
      email: dbUser.rw_email,
      role: dbUser.rw_role,
      fullName: dbUser.rw_full_name,
    };

    // Generar nuevo par de tokens
    const newAccessToken = jwt.sign(userPayload, secret, { expiresIn: '1h' });
    const newRefreshToken = jwt.sign({ userId: dbUser.rw_id }, secret, { expiresIn: '7d' });

    const userResult = {
      rw_id: dbUser.rw_id,
      rw_email: dbUser.rw_email,
      rw_full_name: dbUser.rw_full_name,
      rw_role: dbUser.rw_role,
    };

    return NextResponse.json(
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: userResult,
      },
      { status: 200, headers: { 'x-correlation-id': correlationId } }
    );
  } catch (error) {
    console.error(`[${correlationId}] Refresh Token API error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'x-correlation-id': correlationId } }
    );
  }
}

import { NextResponse } from 'next/server';
import { withUserContext } from '@/infrastructure/database/postgres';
import jwt from 'jsonwebtoken';

interface DecodedToken {
  userId: string;
  email: string;
  role: string;
}

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

  const userId = decoded.userId;

  try {
    const channels = await withUserContext(userId, async (client) => {
      const { rows } = await client.query('SELECT * FROM rw_view_user_conversations ORDER BY rw_name ASC');
      return rows.map(r => ({
        id: r.rw_id,
        name: r.rw_name,
        isPrivate: r.rw_is_private,
        createdBy: r.rw_created_by,
        createdAt: r.rw_created_at
      }));
    });

    return NextResponse.json(
      channels,
      { status: 200, headers: { 'x-correlation-id': correlationId } }
    );
  } catch (error) {
    console.error(`[${correlationId}] Channels GET error:`, error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'x-correlation-id': correlationId } }
    );
  }
}

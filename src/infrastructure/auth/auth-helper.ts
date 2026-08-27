import jwt from 'jsonwebtoken';

interface DecodedToken {
  userId: string;
  email: string;
  role: string;
  fullName: string;
}

export function getAuthUserId(req: Request): DecodedToken | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_jwt_token_clan_riwi_2026'
    ) as DecodedToken;
    return decoded;
  } catch {
    return null;
  }
}

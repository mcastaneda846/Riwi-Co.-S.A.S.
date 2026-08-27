import { NextResponse } from 'next/server';
import { getAuthUserId } from '@/infrastructure/auth/auth-helper';
import { GetChannelMessagesUseCase } from '@/core/use-cases/GetChannelMessagesUseCase';
import { SendMessageUseCase } from '@/core/use-cases/SendMessageUseCase';
import { z } from 'zod';

const getMessagesSchema = z.object({
  channelId: z.string(),
  limit: z.coerce.number().min(1).max(100).default(20),
  cursorDate: z.string().optional(),
  cursorId: z.string().optional(),
});

const postMessageSchema = z.object({
  channelId: z.string(),
  content: z.string().min(1),
});

export async function GET(req: Request) {
  const correlationId = req.headers.get('x-correlation-id') || `corr-${Date.now()}`;

  const auth = getAuthUserId(req);
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'x-correlation-id': correlationId } }
    );
  }

  const { searchParams } = new URL(req.url);
  const params = {
    channelId: searchParams.get('channelId') || undefined,
    limit: searchParams.get('limit') || undefined,
    cursorDate: searchParams.get('cursorDate') || undefined,
    cursorId: searchParams.get('cursorId') || undefined,
  };

  const parsed = getMessagesSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid parameters', details: parsed.error.format() },
      { status: 400, headers: { 'x-correlation-id': correlationId } }
    );
  }

  try {
    const getUseCase = new GetChannelMessagesUseCase();
    const messages = await getUseCase.execute(
      auth.userId,
      parsed.data.channelId,
      parsed.data.limit,
      parsed.data.cursorDate,
      parsed.data.cursorId
    );

    return NextResponse.json(
      { items: messages },
      { status: 200, headers: { 'x-correlation-id': correlationId } }
    );
  } catch (error: unknown) {
    console.error(`[${correlationId}] GET messages error:`, error);
    
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('row-level security policy')) {
      return NextResponse.json(
        { error: 'Forbidden: Access denied to this channel' },
        { status: 403, headers: { 'x-correlation-id': correlationId } }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'x-correlation-id': correlationId } }
    );
  }
}

export async function POST(req: Request) {
  const correlationId = req.headers.get('x-correlation-id') || `corr-${Date.now()}`;

  const auth = getAuthUserId(req);
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: { 'x-correlation-id': correlationId } }
    );
  }

  try {
    const body = await req.json();
    const parsed = postMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: parsed.error.format() },
        { status: 400, headers: { 'x-correlation-id': correlationId } }
      );
    }

    const sendUseCase = new SendMessageUseCase();
    const message = await sendUseCase.execute(
      auth.userId,
      parsed.data.channelId,
      parsed.data.content
    );

    return NextResponse.json(
      message,
      { status: 201, headers: { 'x-correlation-id': correlationId } }
    );
  } catch (error: unknown) {
    console.error(`[${correlationId}] POST message error:`, error);
    
    const errorMessage = error instanceof Error ? error.message : '';
    if (errorMessage.includes('row-level security policy')) {
      return NextResponse.json(
        { error: 'Forbidden: You are not a member of this channel' },
        { status: 403, headers: { 'x-correlation-id': correlationId } }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'x-correlation-id': correlationId } }
    );
  }
}

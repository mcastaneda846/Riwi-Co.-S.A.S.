import { withUserContext } from '../../infrastructure/database/postgres';
import { CopilotQueryResult, CopilotContext } from '../domain/CopilotContext';
import OpenAI from 'openai';
import prompts from '../../config/prompts.json';

interface CopilotDbRow {
  rw_id?: string;
  id?: string;
  rw_channel_id: string;
  channel_name: string;
  author_name: string;
  rw_content?: string;
  content?: string;
  rw_created_at: string | Date;
  similarity?: string | number;
}

export class CopilotRagUseCase {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  async execute(
    userId: string,
    userFullName: string,
    userRole: string,
    userEmail: string,
    queryText: string
  ): Promise<CopilotQueryResult> {
    return await withUserContext(userId, async (client) => {
      let contexts: CopilotContext[] = [];
      let answer = '';

      try {
        let embedding: number[] | null = null;

        // 1. Generate embedding if OpenAI is configured
        if (this.openai) {
          try {
            const embedRes = await this.openai.embeddings.create({
              model: 'text-embedding-3-small',
              input: queryText,
            });
            embedding = embedRes.data[0].embedding;
          } catch (e) {
            console.warn('OpenAI embedding generation failed, falling back to text query:', e);
          }
        }

        // 2. Query contexts using the user context (RLS-enforced)
        let dbRows: CopilotDbRow[] = [];
        if (embedding) {
          const dbQuery = `
            SELECT s.*, c.rw_name as channel_name, u.rw_full_name as author_name
            FROM rw_fn_copilot_context_search($1::vector, 0.1, 5) s
            JOIN rw_channels c ON s.rw_channel_id = c.rw_id
            JOIN rw_users u ON s.rw_user_id = u.rw_id
          `;
          const embeddingStr = `[${embedding.join(',')}]`;
          const res = await client.query(dbQuery, [embeddingStr]);
          dbRows = res.rows as CopilotDbRow[];
        } else {
          // Keyword search fallback that respects RLS automatically since it targets table/view
          const fallbackQuery = `
            SELECT m.*, c.rw_name as channel_name, u.rw_full_name as author_name
            FROM rw_messages m
            JOIN rw_channels c ON m.rw_channel_id = c.rw_id
            JOIN rw_users u ON m.rw_user_id = u.rw_id
            WHERE m.rw_content ILIKE $1 AND m.rw_is_deleted = FALSE
            ORDER BY m.rw_created_at DESC
            LIMIT 5
          `;
          const res = await client.query(fallbackQuery, [`%${queryText}%`]);
          dbRows = (res.rows as CopilotDbRow[]).map(r => ({ ...r, similarity: 0.9 }));
        }

        contexts = dbRows.map(r => ({
          messageId: r.rw_id || r.id,
          channelId: r.rw_channel_id,
          channelName: r.channel_name,
          authorName: r.author_name,
          content: r.rw_content || r.content,
          createdAt: new Date(r.rw_created_at).toISOString(),
          similarity: parseFloat(r.similarity || '0.9')
        }));

        // If no context was found, deny/negative response
        if (contexts.length === 0) {
          return {
            answer: `No encontré información relevante ni autorizada sobre "${queryText}" en tus canales permitidos.`,
            citations: [],
            isAuthorized: false
          };
        }

        // 3. Query LLM if OpenAI is configured
        // 3. Construct system prompt from versioned JSON
        const contextString = contexts
          .map(c => `[ID: ${c.messageId} | Autor: ${c.authorName} | Canal: ${c.channelName}] Mensaje: "${c.content}"`)
          .join('\n');

        const systemPrompt = prompts.copilotSystemPrompt
          .replace('{{userFullName}}', userFullName)
          .replace('{{userEmail}}', userEmail)
          .replace('{{userRole}}', userRole)
          .replace('{{contextString}}', contextString);

        if (this.openai) {
          const chatRes = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: queryText }
            ],
            temperature: 0.2
          });

          answer = chatRes.choices[0].message.content || '';
        } else {
          // 4. Mock response generation for offline testing
          const matchingContexts = contexts.slice(0, 3);
          answer = `Hola ${userFullName} (${userRole}). De acuerdo con los mensajes recuperados de tus canales autorizados, la consulta sobre "${queryText}" menciona lo siguiente:\n\n`;
          matchingContexts.forEach(c => {
            answer += `• "${c.content}" de ${c.authorName} en el canal #${c.channelName} [${c.messageId} | ${c.authorName} | ${c.channelName}].\n`;
          });
        }

        // 5. Register copilot usage (tokens / queries)
        try {
          const promptTokens = Math.ceil((systemPrompt.length + queryText.length) / 4);
          const completionTokens = Math.ceil(answer.length / 4);
          const totalTokens = promptTokens + completionTokens;

          const usageQuery = `
            INSERT INTO rw_copilot_usage (rw_user_id, rw_tokens_used, rw_prompt_tokens, rw_completion_tokens)
            VALUES ($1, $2, $3, $4)
          `;
          await client.query(usageQuery, [userId, totalTokens, promptTokens, completionTokens]);
        } catch (e) {
          console.warn('Failed to insert copilot usage log:', e);
        }

        return {
          answer,
          citations: contexts,
          isAuthorized: true
        };

      } catch (err) {
        console.error('Copilot RAG error:', err);
        return {
          answer: 'Hubo un error interno al procesar la consulta del Copiloto.',
          citations: [],
          isAuthorized: false
        };
      }
    });
  }
}

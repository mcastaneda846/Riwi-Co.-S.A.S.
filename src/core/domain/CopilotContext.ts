export interface CopilotContext {
  messageId: string;
  channelId: string;
  channelName: string;
  authorName: string;
  content: string;
  createdAt: string;
  similarity: number;
}

export interface CopilotQueryResult {
  answer: string;
  citations: CopilotContext[];
  isAuthorized: boolean;
}

export type BotName = 'codeRabbit' | 'devin' | 'claude' | 'openAI' | 'cursor';

export interface BotConfig {
  codeRabbit: boolean;
  devin: boolean;
  claude: boolean;
  openAI: boolean;
  cursor: boolean;
}

export interface ChatRequest {
  prompt: string;
}

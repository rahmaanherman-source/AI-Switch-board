import express from 'express';
import OpenAI from 'openai';

import { getActiveBots, readSettings } from './config.js';
import type { BotConfig, ChatRequest } from './types.js';

const router = express.Router();

router.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'AI Switchboard backend' });
});

router.get('/api/config', async (_req, res) => {
  const settings = await readSettings();
  res.json(settings);
});

router.post('/api/config', async (req, res) => {
  const nextSettings = req.body as Partial<BotConfig>;
  const settings = await readSettings();

  const merged = { ...settings, ...nextSettings };
  await import('./config.js').then(({ writeSettings }) => writeSettings(merged));

  res.json(merged);
});

router.post('/api/chat', async (req, res) => {
  const { prompt } = req.body as ChatRequest;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'A non-empty prompt is required.' });
  }

  const settings = await readSettings();
  const activeBots = getActiveBots(settings);

  if (activeBots.length === 0) {
    return res.status(200).json({
      message: 'No AI tools are active. Turn on at least one switch to route a prompt.',
      activeBots: [],
      output: 'No active AI routes.',
    });
  }

  const responses = await Promise.all(
    activeBots.map(async (botName) => {
      if (botName === 'openAI' || botName === 'cursor') {
        return { bot: botName, output: await generateOpenAIResponse(prompt) };
      }

      if (botName === 'claude') {
        return { bot: botName, output: await generateAnthropicResponse(prompt) };
      }

      if (botName === 'codeRabbit') {
        return {
          bot: botName,
          output: `CodeRabbit is enabled and ready. Prompt queued for review: "${prompt}"`,
        };
      }

      if (botName === 'devin') {
        return {
          bot: botName,
          output: `Devin is enabled. The following request is now being routed: "${prompt}"`,
        };
      }

      return {
        bot: botName,
        output: `No process configured for ${botName}.`,
      };
    }),
  );

  res.json({
    activeBots,
    output: responses.map((item) => `${item.bot}: ${item.output}`).join('\n\n'),
    responses,
  });
});

async function generateOpenAIResponse(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return 'OpenAI is active, but OPENAI_API_KEY is not configured in your environment.';
  }

  try {
    const client = new OpenAI({
      apiKey,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are the AI Switchboard response layer.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
    });

    return completion.choices[0]?.message?.content ?? 'OpenAI returned an empty response.';
  } catch (error) {
    return `OpenAI call failed: ${error instanceof Error ? error.message : 'unknown error'}`;
  }
}

async function generateAnthropicResponse(prompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return 'Claude is active, but ANTHROPIC_API_KEY is not configured in your environment.';
  }

  try {
    const response = await fetch(process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      return `Anthropic request failed: ${response.status} ${response.statusText}`;
    }

    const data = (await response.json()) as { content?: Array<{ text?: string }> };
    return data.content?.[0]?.text ?? 'Anthropic returned an empty response.';
  } catch (error) {
    return `Anthropic call failed: ${error instanceof Error ? error.message : 'unknown error'}`;
  }
}

export { router };

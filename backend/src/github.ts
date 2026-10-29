import express, { type Application } from 'express';

import { readSettings } from './config.js';

const webhooks = new (await import('@octokit/webhooks')).Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET || 'development-secret',
});

export function registerGithubWebhook(app: Application): void {
  app.use('/api/github/webhook', express.json({ type: 'application/json' }));

  app.post('/api/github/webhook', async (req, res) => {
    const signature = req.headers['x-hub-signature-256'];
    const rawBody = JSON.stringify(req.body ?? {});

    if (!signature) {
      return res.status(401).json({ error: 'Missing GitHub signature header.' });
    }

    try {
      await webhooks.verify(rawBody, signature);
    } catch {
      return res.status(401).json({ error: 'Invalid GitHub webhook signature.' });
    }

    const eventName = req.headers['x-github-event'];
    const payload = req.body ?? {};
    const settings = await readSettings();

    if (eventName === 'pull_request') {
      const prNumber = payload.pull_request?.number ?? 'unknown';
      const muted = [] as string[];

      if (!settings.codeRabbit) muted.push('@coderabbit pause');
      if (!settings.claude) muted.push('@claude ignore this PR');
      if (!settings.devin) muted.push('@devin pause');

      return res.status(200).json({
        ok: true,
        event: eventName,
        action: payload.action,
        prNumber,
        muted,
        settings,
      });
    }

    if (eventName === 'push') {
      return res.status(200).json({
        ok: true,
        event: eventName,
        ref: payload.ref ?? 'unknown',
        settings,
      });
    }

    return res.status(200).json({ ok: true, event: eventName ?? 'unknown', settings });
  });
}

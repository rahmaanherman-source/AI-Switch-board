import type { Application, Request, Response } from 'express';
import { App } from '@octokit/app';
import { Webhooks } from '@octokit/webhooks';
import * as Sentry from '@sentry/node';

import { readSettings } from './config.js';

const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
const verifier = webhookSecret ? new Webhooks({ secret: webhookSecret }) : null;

const githubAppId = process.env.GITHUB_APP_ID;
const githubPrivateKey = process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n');
const githubApp = webhookSecret && githubAppId && githubPrivateKey
  ? new App({
      appId: Number(githubAppId),
      privateKey: githubPrivateKey,
      webhooks: { secret: webhookSecret },
    })
  : null;

export function registerGithubWebhook(app: Application): void {
  // This route MUST receive the untouched request bytes. Do not put express.json()
  // before it; GitHub signs the raw body, not JSON.stringify(parsedBody).
  app.post(
    '/api/github/webhook',
    (awaitableRawBodyMiddleware()),
    async (req: Request, res: Response) => {
      if (!verifier) {
        return res.status(503).json({
          error: 'GitHub webhook is not configured.',
          status: 'NOT CONFIGURED',
        });
      }

      const signature = req.header('x-hub-signature-256');
      const eventName = req.header('x-github-event');
      const deliveryId = req.header('x-github-delivery');
      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';

      if (!signature || !eventName || !deliveryId || !rawBody) {
        return res.status(400).json({ error: 'Required GitHub webhook headers or raw body are missing.' });
      }

      try {
        await verifier.verify(rawBody, signature);
      } catch (error) {
        Sentry.captureMessage('Rejected GitHub webhook with invalid signature', 'warning');
        return res.status(401).json({ error: 'Invalid GitHub webhook signature.' });
      }

      let payload: Record<string, any>;
      try {
        payload = JSON.parse(rawBody) as Record<string, any>;
      } catch {
        return res.status(400).json({ error: 'Webhook body is not valid JSON.' });
      }

      if (eventName !== 'pull_request' || !['opened', 'reopened'].includes(String(payload.action))) {
        return res.status(202).json({
          ok: true,
          deliveryId,
          event: eventName,
          action: payload.action ?? null,
          status: 'IGNORED — no matching handler',
        });
      }

      const owner = payload.repository?.owner?.login;
      const repo = payload.repository?.name;
      const issueNumber = payload.pull_request?.number;
      const installationId = payload.installation?.id;

      if (!owner || !repo || !Number.isInteger(issueNumber)) {
        return res.status(400).json({ error: 'Pull request payload is missing repository or PR identifiers.' });
      }

      const settings = await readSettings();
      const muted: string[] = [];
      const manualActions: string[] = [];

      // Only issue a mute command whose syntax is supported. Never invent commands
      // for products that do not expose a documented PR-comment control.
      if (!settings.codeRabbit) {
        if (!githubApp || !installationId) {
          manualActions.push('CodeRabbit is OFF, but GitHub App credentials/installation are missing; pause comment was not posted.');
        } else {
          try {
            const octokit = await githubApp.getInstallationOctokit(Number(installationId));
            const comments = await octokit.rest.issues.listComments({
              owner,
              repo,
              issue_number: Number(issueNumber),
              per_page: 100,
            });
            const alreadyPaused = comments.data.some((comment) =>
              comment.body?.trim() === '@coderabbitai pause',
            );

            if (!alreadyPaused) {
              await octokit.rest.issues.createComment({
                owner,
                repo,
                issue_number: Number(issueNumber),
                body: '@coderabbitai pause',
              });
            }
            muted.push('CodeRabbit');
          } catch (error) {
            Sentry.captureException(error, {
              tags: { subsystem: 'github-webhook', action: 'mute-coderabbit' },
              extra: { owner, repo, issueNumber, deliveryId },
            });
            manualActions.push('CodeRabbit is OFF, but the pause command failed; check GitHub App installation and Issues write permission.');
          }
        }
      }

      if (!settings.devin) {
        manualActions.push('Devin is OFF in Switchboard. Disable bot responses in Devin settings; no supported PR-comment mute command is configured.');
      }
      if (!settings.claude) {
        manualActions.push('Claude is OFF in Switchboard. No provider-specific PR mute command is configured, so no comment was posted.');
      }

      return res.status(200).json({
        ok: true,
        deliveryId,
        event: eventName,
        action: payload.action,
        repository: `${owner}/${repo}`,
        pullRequest: issueNumber,
        signatureVerified: true,
        muted,
        manualActions,
      });
    },
  );
}

// Express raw-body parser: mounted only on the webhook route.
function awaitableRawBodyMiddleware() {
  return (req: Request, res: Response, next: (error?: unknown) => void) => {
    import('express').then(({ default: express }) =>
      express.raw({ type: 'application/json', limit: '2mb' })(req, res, next),
    ).catch(next);
  };
}

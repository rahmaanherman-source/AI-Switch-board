import dotenv from 'dotenv';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import * as Sentry from '@sentry/node';

import { router as apiRouter } from './router.js';
import { registerGithubWebhook } from './github.js';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    sendDefaultPii: false,
  });
}

const app = express();
const port = Number(process.env.PORT || 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';

app.disable('x-powered-by');
app.use(cors({ origin: frontendOrigin }));

// Register the signed raw-body webhook BEFORE JSON parsing. GitHub HMAC verification
// will fail if express.json() consumes and reserializes the payload first.
registerGithubWebhook(app);

app.use(express.json({ limit: '1mb' }));
app.use(apiRouter);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'AI Switchboard backend',
    monitoring: process.env.SENTRY_DSN ? 'SENTRY CONFIGURED' : 'SENTRY NOT CONFIGURED',
  });
});

Sentry.setupExpressErrorHandler(app);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  Sentry.captureException(error);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(port, () => {
  console.log(`AI Switchboard backend listening on http://localhost:${port}`);
  console.log(process.env.SENTRY_DSN ? 'Sentry monitoring configured.' : 'Sentry not configured; set SENTRY_DSN to enable it.');
});

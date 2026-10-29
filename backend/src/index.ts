import dotenv from 'dotenv';
import path from 'node:path';
import express from 'express';
import cors from 'cors';

import { router as apiRouter } from './router.js';
import { registerGithubWebhook } from './github.js';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(apiRouter);
registerGithubWebhook(app);

app.listen(port, () => {
  console.log(`AI Switchboard backend listening on http://localhost:${port}`);
});

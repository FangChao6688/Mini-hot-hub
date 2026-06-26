import cors from 'cors';
import express from 'express';
import { hotRouter } from './routes/hot.js';

const app = express();
const port = Number(process.env.PORT) || 3001;

function parseCorsOrigins(): string | string[] {
  const raw = process.env.CORS_ORIGIN?.trim();

  if (!raw) {
    return 'http://localhost:5173';
  }

  if (raw === '*') {
    return '*';
  }

  const origins = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return origins.length === 1 ? origins[0]! : origins;
}

app.use(
  cors({
    origin: parseCorsOrigins(),
  }),
);

app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api/hot', hotRouter);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

import { Router } from 'express';
import { fetchHotByCategory, fetchHotBySource } from '../services/index.js';
import { isHotSource, resolveHotCategory } from '../types/hot.js';

export const hotRouter = Router();

const isDev = process.env.NODE_ENV !== 'production';

hotRouter.get('/', async (req, res) => {
  const category = resolveHotCategory(req.query.category);
  const skipCache = isDev && req.query.refresh === '1';
  res.json(await fetchHotByCategory(category, { skipCache }));
});

hotRouter.get('/:source', async (req, res) => {
  const { source } = req.params;

  if (!isHotSource(source)) {
    res.status(404).json({ message: 'Unknown source' });
    return;
  }

  const skipCache = isDev && req.query.refresh === '1';
  const { platform, cacheHit } = await fetchHotBySource(source, { skipCache });

  if (cacheHit) {
    console.log(`[cache hit] ${source}`);
  }

  res.json(platform);
});

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/error';

import configRoutes from './routes/config.routes';
import machinesRoutes from './routes/machines.routes';
import workersRoutes from './routes/workers.routes';
import productsRoutes from './routes/products.routes';
import ordersRoutes from './routes/orders.routes';
import scheduleRoutes from './routes/schedule.routes';
import productionRoutes from './routes/production.routes';
import aiRoutes from './routes/ai.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/config', configRoutes);
app.use('/api/machines', machinesRoutes);
app.use('/api/workers', workersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/ai', aiRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`ReWAir API running on http://localhost:${PORT}`);
});

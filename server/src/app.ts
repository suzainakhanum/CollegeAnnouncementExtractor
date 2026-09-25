import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';

const app: Application = express();

// ── Middleware ────────────────────────────────────────────────────────────────

// Enable CORS for the React dev server (localhost:5173 by default with Vite)
// and any configured production origin.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
    methods: ['GET', 'POST'],
  })
);

// Parse incoming JSON request bodies.
app.use(express.json());

// ── Health route ──────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// ── Feature routes ────────────────────────────────────────────────────────────

// Lazy-load the analyze router so that this file can be imported in tests
// even before the route module is fully implemented.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const analyzeRouter = require('./routes/analyze').default;
app.use('/api/analyze', analyzeRouter);

// ── Global error handler ──────────────────────────────────────────────────────

// Catches any errors that slip past individual route handlers.
// Must have 4 parameters for Express to recognise it as an error handler.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Log the error server-side only; never expose internals to the client.
  console.error('[GlobalErrorHandler]', err.message);
  res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
});

export default app;

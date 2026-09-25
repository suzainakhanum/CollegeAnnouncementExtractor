import dotenv from 'dotenv';

// Load environment variables from .env before importing anything that reads them.
dotenv.config();

import app from './app';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.listen(PORT, () => {
  console.log(`[Campus Action] Server listening on port ${PORT}`);
});

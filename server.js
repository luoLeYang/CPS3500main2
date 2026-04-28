const next = require('next');
const dotenv = require('dotenv');

// Support local development configuration while keeping .env compatibility.
dotenv.config({ path: '.env.local' });
dotenv.config();

const { connectDb, initializeDatabase } = require('./server/db');
const { createApp } = require('./server/app');

const dev = process.env.NODE_ENV !== 'production';
const projectDir = __dirname;
const hostname = '0.0.0.0';
const port = Number(process.env.PORT || 3000);

async function startServer() {
  const nextApp = next({ dev, dir: projectDir, hostname, port });
  const handle = nextApp.getRequestHandler();

  await initializeDatabase();
  await nextApp.prepare();

  const app = createApp({ getDb: connectDb, handle });
  return app.listen(port, hostname, (error) => {
    if (error) {
      throw error;
    }
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = {
  startServer,
};
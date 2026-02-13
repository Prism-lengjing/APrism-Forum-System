import type { Server } from 'http';
import { initializeDatabase } from './database/connection';
import { createApp } from './app';

const PORT = process.env.PORT || 3001;

export async function startServer(port = Number(PORT)): Promise<Server> {
  await initializeDatabase();
  const app = createApp();

  return app.listen(port, () => {
    console.log(`🚀 服务器运行在 http://localhost:${port}`);
    console.log(`📊 健康检查: http://localhost:${port}/health`);
    console.log(`📡 API入口: http://localhost:${port}/api`);
    console.log(`📚 API文档: http://localhost:${port}/api/docs`);
  });
}

if (require.main === module) {
  startServer().catch(console.error);
}

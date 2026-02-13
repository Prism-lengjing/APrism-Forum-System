import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './docs/openapi';
import authRoutes from './routes/auth';
import forumRoutes from './routes/forums';
import threadRoutes from './routes/threads';
import postRoutes from './routes/posts';
import userRoutes from './routes/users';
import pointsRoutes from './routes/points';
import { HttpError } from './utils/httpError';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    })
  );

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      message: 'Server is running',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api', (_req, res) => {
    res.json({
      success: true,
      message: 'APrism Forum API v1.0',
      name: '光圈棱镜论坛系统',
      endpoints: {
        health: '/health',
        docs: '/api/docs',
        openapi: '/api/docs.json',
        auth: '/api/auth',
        categories: '/api/categories',
        forums: '/api/forums',
        forumThreads: '/api/forums/:id/threads',
        threadDetail: '/api/threads/:id',
        threadPosts: '/api/threads/:id/posts',
        posts: '/api/posts',
        users: '/api/users',
        points: '/api/points',
      },
    });
  });

  app.get('/api/docs.json', (_req, res) => {
    res.json(openApiSpec);
  });
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.use('/api/auth', authRoutes);
  app.use('/api', forumRoutes);
  app.use('/api', threadRoutes);
  app.use('/api', postRoutes);
  app.use('/api', userRoutes);
  app.use('/api', pointsRoutes);

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      message: 'API endpoint not found',
    });
  });

  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (err instanceof HttpError) {
        return res.status(err.statusCode).json({
          success: false,
          message: err.message,
        });
      }

      console.error('Error:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
      });
    }
  );

  return app;
}

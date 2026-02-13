import fs from 'fs';
import path from 'path';
import type { Express } from 'express';
import request from 'supertest';
import { createApp } from '../../src/app';
import { closeDatabase, getDatabase, initializeDatabase } from '../../src/database/connection';

const dbPath = path.resolve(__dirname, '../../data/forum-test.db');

function removeTestDb() {
  const candidates = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

function cleanupPhaseData() {
  const db = getDatabase();
  db.prepare("DELETE FROM point_logs WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'jest_%')").run();
  db.prepare("DELETE FROM daily_signins WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'jest_%')").run();
  db.prepare("DELETE FROM posts WHERE content LIKE 'JEST_%'").run();
  db.prepare("DELETE FROM threads WHERE title LIKE 'JEST_%'").run();
  db.prepare("DELETE FROM users WHERE username LIKE 'jest_%'").run();
}

let uniqueCounter = 0;
function nextKey() {
  uniqueCounter += 1;
  return `${Date.now()}_${uniqueCounter}`;
}

async function registerUser(app: Express, label: string) {
  const unique = nextKey();
  const username = `jest_${label}_${unique}`;
  const email = `${username}@example.com`;

  const register = await request(app).post('/api/auth/register').send({
    username,
    email,
    password: 'password123',
  });

  expect(register.status).toBe(201);
  const token = register.body.data.token as string;
  expect(token.length).toBeGreaterThan(20);

  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
  expect(me.status).toBe(200);
  const userId = Number(me.body.data.id);

  return { token, userId, username };
}

describe('Phase 1-2 API Integration', () => {
  let app: Express;

  beforeAll(async () => {
    removeTestDb();
    await initializeDatabase();
    app = createApp();
  });

  beforeEach(() => {
    cleanupPhaseData();
  });

  afterAll(() => {
    closeDatabase();
    removeTestDb();
  });

  it('GET /health should return service status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it('GET /api should return endpoint map', async () => {
    const response = await request(app).get('/api');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.endpoints.docs).toBe('/api/docs');
    expect(response.body.endpoints.points).toBe('/api/points');
  });

  it('GET /api/forums should return forum list', async () => {
    const response = await request(app).get('/api/forums');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/categories should return category list', async () => {
    const response = await request(app).get('/api/categories');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/forums/:id and /api/forums/:id/threads should return forum data', async () => {
    const forumResponse = await request(app).get('/api/forums/1');
    expect(forumResponse.status).toBe(200);
    expect(forumResponse.body.data.id).toBe(1);

    const threadsResponse = await request(app).get('/api/forums/1/threads?page=1&pageSize=10');
    expect(threadsResponse.status).toBe(200);
    expect(Array.isArray(threadsResponse.body.data.items)).toBe(true);
    expect(threadsResponse.body.data.page).toBe(1);
    expect(threadsResponse.body.data.pageSize).toBe(10);
  });

  it('GET /api/forums/:id should return 404 when forum does not exist', async () => {
    const response = await request(app).get('/api/forums/99999');
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  it('GET /api/docs.json should return openapi schema', async () => {
    const response = await request(app).get('/api/docs.json');
    expect(response.status).toBe(200);
    expect(response.body.openapi).toBe('3.0.3');
    expect(response.body.paths['/api/forums']).toBeTruthy();
    expect(response.body.paths['/api/points/me/summary']).toBeTruthy();
  });

  it('GET /api/auth/me should reject unauthorized request', async () => {
    const response = await request(app).get('/api/auth/me');
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('points endpoints should reject unauthorized request', async () => {
    const summaryResponse = await request(app).get('/api/points/me/summary');
    expect(summaryResponse.status).toBe(401);

    const logsResponse = await request(app).get('/api/points/me/logs');
    expect(logsResponse.status).toBe(401);

    const signinResponse = await request(app).post('/api/points/me/signin');
    expect(signinResponse.status).toBe(401);
  });

  it('auth + thread + post workflow should succeed and include thread detail query', async () => {
    const user = await registerUser(app, 'workflow');

    const createThread = await request(app)
      .post('/api/threads')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        forumId: 1,
        title: `JEST_thread_${nextKey()}`,
        content: `JEST_content_${nextKey()}`,
        type: 'normal',
      });
    expect(createThread.status).toBe(201);
    const threadId = createThread.body.data.id as number;

    const getThread = await request(app).get(`/api/threads/${threadId}`);
    expect(getThread.status).toBe(200);
    expect(getThread.body.data.id).toBe(threadId);

    const createPost = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        threadId,
        content: `JEST_reply_${nextKey()}`,
      });
    expect(createPost.status).toBe(201);

    const listPosts = await request(app).get(`/api/threads/${threadId}/posts`);
    expect(listPosts.status).toBe(200);
    expect(listPosts.body.data.items.length).toBeGreaterThan(0);

    const summary = await request(app)
      .get('/api/points/me/summary')
      .set('Authorization', `Bearer ${user.token}`);
    expect(summary.status).toBe(200);
    expect(Number(summary.body.data.experience)).toBeGreaterThanOrEqual(15);
    expect(Number(summary.body.data.level)).toBeGreaterThanOrEqual(1);

    const logs = await request(app)
      .get('/api/points/me/logs?page=1&pageSize=20')
      .set('Authorization', `Bearer ${user.token}`);
    expect(logs.status).toBe(200);
    expect(Array.isArray(logs.body.data.items)).toBe(true);
    const actions = (logs.body.data.items as Array<{ action: string }>).map((item) => item.action);
    expect(actions).toContain('create_thread');
    expect(actions).toContain('create_post');
  });

  it('daily signin should award points and prevent repeated sign-in', async () => {
    const user = await registerUser(app, 'signin');

    const preSummary = await request(app)
      .get('/api/points/me/summary')
      .set('Authorization', `Bearer ${user.token}`);
    expect(preSummary.status).toBe(200);
    expect(preSummary.body.data.canSignInToday).toBe(true);

    const signin = await request(app)
      .post('/api/points/me/signin')
      .set('Authorization', `Bearer ${user.token}`);
    expect(signin.status).toBe(200);
    expect(Number(signin.body.data.pointsAwarded)).toBeGreaterThanOrEqual(2);
    expect(Number(signin.body.data.streak)).toBe(1);
    expect(signin.body.data.summary.canSignInToday).toBe(false);

    const repeatSignin = await request(app)
      .post('/api/points/me/signin')
      .set('Authorization', `Bearer ${user.token}`);
    expect(repeatSignin.status).toBe(409);

    const logs = await request(app)
      .get('/api/points/me/logs?page=1&pageSize=10')
      .set('Authorization', `Bearer ${user.token}`);
    expect(logs.status).toBe(200);
    const actions = (logs.body.data.items as Array<{ action: string }>).map((item) => item.action);
    expect(actions).toContain('daily_signin');
  });

  it('thread update/delete should enforce owner permission', async () => {
    const owner = await registerUser(app, 'thread_owner');
    const anotherUser = await registerUser(app, 'thread_other');

    const createThread = await request(app)
      .post('/api/threads')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        forumId: 1,
        title: `JEST_thread_owner_${nextKey()}`,
        content: `JEST_thread_owner_content_${nextKey()}`,
      });
    expect(createThread.status).toBe(201);
    const threadId = Number(createThread.body.data.id);

    const forbiddenUpdate = await request(app)
      .put(`/api/threads/${threadId}`)
      .set('Authorization', `Bearer ${anotherUser.token}`)
      .send({
        title: `JEST_forbidden_update_${nextKey()}`,
      });
    expect(forbiddenUpdate.status).toBe(403);

    const ownerUpdate = await request(app)
      .put(`/api/threads/${threadId}`)
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        title: `JEST_updated_title_${nextKey()}`,
        content: `JEST_updated_content_${nextKey()}`,
      });
    expect(ownerUpdate.status).toBe(200);
    expect(ownerUpdate.body.data.title).toContain('JEST_updated_title_');

    const forbiddenDelete = await request(app)
      .delete(`/api/threads/${threadId}`)
      .set('Authorization', `Bearer ${anotherUser.token}`);
    expect(forbiddenDelete.status).toBe(403);

    const ownerDelete = await request(app)
      .delete(`/api/threads/${threadId}`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(ownerDelete.status).toBe(200);

    const getDeleted = await request(app).get(`/api/threads/${threadId}`);
    expect(getDeleted.status).toBe(404);
  });

  it('post create/like/list should support parent reply and locked-thread check', async () => {
    const author = await registerUser(app, 'post_author');
    const replier = await registerUser(app, 'post_replier');

    const threadResponse = await request(app)
      .post('/api/threads')
      .set('Authorization', `Bearer ${author.token}`)
      .send({
        forumId: 1,
        title: `JEST_post_thread_${nextKey()}`,
        content: `JEST_post_thread_content_${nextKey()}`,
      });
    expect(threadResponse.status).toBe(201);
    const threadId = Number(threadResponse.body.data.id);

    const unauthorizedPost = await request(app).post('/api/posts').send({
      threadId,
      content: `JEST_unauthorized_${nextKey()}`,
    });
    expect(unauthorizedPost.status).toBe(401);

    const firstPost = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${replier.token}`)
      .send({
        threadId,
        content: `JEST_first_post_${nextKey()}`,
      });
    expect(firstPost.status).toBe(201);
    const firstPostId = Number(firstPost.body.data.id);
    expect(firstPost.body.data.floor).toBe(1);

    const invalidParent = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${replier.token}`)
      .send({
        threadId,
        content: `JEST_invalid_parent_${nextKey()}`,
        parentId: 99999999,
      });
    expect(invalidParent.status).toBe(404);

    const secondPost = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${author.token}`)
      .send({
        threadId,
        content: `JEST_second_post_${nextKey()}`,
        parentId: firstPostId,
      });
    expect(secondPost.status).toBe(201);
    expect(secondPost.body.data.floor).toBe(2);
    expect(secondPost.body.data.parentId).toBe(firstPostId);

    const likeResponse = await request(app).post(`/api/posts/${firstPostId}/like`);
    expect(likeResponse.status).toBe(200);
    expect(Number(likeResponse.body.data.likeCount)).toBeGreaterThanOrEqual(1);

    const listPosts = await request(app).get(`/api/threads/${threadId}/posts?page=1&pageSize=30`);
    expect(listPosts.status).toBe(200);
    expect(listPosts.body.data.total).toBe(2);

    getDatabase()
      .prepare('UPDATE threads SET is_locked = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(threadId);

    const lockedThreadReply = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${author.token}`)
      .send({
        threadId,
        content: `JEST_locked_thread_${nextKey()}`,
      });
    expect(lockedThreadReply.status).toBe(400);
  });

  it('user profile API should support read and update', async () => {
    const user = await registerUser(app, 'profile');

    const publicProfile = await request(app).get(`/api/users/${user.userId}`);
    expect(publicProfile.status).toBe(200);
    expect(publicProfile.body.data.id).toBe(user.userId);

    const unauthorizedUpdate = await request(app).put('/api/users/me').send({
      bio: `JEST_bio_unauthorized_${nextKey()}`,
    });
    expect(unauthorizedUpdate.status).toBe(401);

    const updateProfile = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        bio: `JEST_bio_${nextKey()}`,
        avatar: `https://example.com/JEST_avatar_${nextKey()}.png`,
      });
    expect(updateProfile.status).toBe(200);
    expect(updateProfile.body.data.bio).toContain('JEST_bio_');
    expect(updateProfile.body.data.avatar).toContain('JEST_avatar_');
  });

  it('undefined API endpoint should return 404', async () => {
    const response = await request(app).get('/api/not-found-endpoint');
    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});

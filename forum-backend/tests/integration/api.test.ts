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
  db.prepare('DELETE FROM messages').run();
  db.prepare('DELETE FROM message_conversations').run();
  db.prepare('DELETE FROM moderator_action_logs').run();
  db.prepare(
    "DELETE FROM forum_moderators WHERE user_id IN (SELECT id FROM users WHERE username LIKE 'jest_%') OR granted_by IN (SELECT id FROM users WHERE username LIKE 'jest_%')"
  ).run();
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

async function loginUser(app: Express, identifier: string) {
  const login = await request(app).post('/api/auth/login').send({
    identifier,
    password: 'password123',
  });
  expect(login.status).toBe(200);
  return login.body.data.token as string;
}

async function promoteToAdminAndLogin(app: Express, userId: number, username: string) {
  getDatabase().prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', userId);
  return loginUser(app, username);
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
    expect(response.body.endpoints.pointsLeaderboard).toBe('/api/points/leaderboard');
    expect(response.body.endpoints.signinLeaderboard).toBe('/api/points/signin-leaderboard');
    expect(response.body.endpoints.badges).toBe('/api/badges');
    expect(response.body.endpoints.notifications).toBe('/api/notifications');
    expect(response.body.endpoints.messages).toBe('/api/messages');
    expect(response.body.endpoints.messageConversations).toBe('/api/messages/conversations');
    expect(response.body.endpoints.conversationMessages).toBe('/api/messages/conversations/:id');
    expect(response.body.endpoints.threadSearch).toBe('/api/search/threads');
    expect(response.body.endpoints.userSearch).toBe('/api/search/users');
    expect(response.body.endpoints.forumModerators).toBe('/api/forums/:id/moderators');
    expect(response.body.endpoints.forumModeratorLogs).toBe('/api/forums/:id/moderator-logs');
    expect(response.body.endpoints.threadModeration).toBe('/api/threads/:id/moderation');
    expect(response.body.endpoints.threadMove).toBe('/api/threads/:id/move');
    expect(response.body.endpoints.userFollow).toBe('/api/users/:id/follow');
    expect(response.body.endpoints.userFollowStatus).toBe('/api/users/:id/follow-status');
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
    expect(response.body.paths['/api/forums/{id}/moderators']).toBeTruthy();
    expect(response.body.paths['/api/forums/{id}/moderator-logs']).toBeTruthy();
    expect(response.body.paths['/api/points/me/summary']).toBeTruthy();
    expect(response.body.paths['/api/points/leaderboard']).toBeTruthy();
    expect(response.body.paths['/api/points/signin-leaderboard']).toBeTruthy();
    expect(response.body.paths['/api/badges']).toBeTruthy();
    expect(response.body.paths['/api/threads/{id}/moderation']).toBeTruthy();
    expect(response.body.paths['/api/threads/{id}/move']).toBeTruthy();
    expect(response.body.paths['/api/notifications']).toBeTruthy();
    expect(response.body.paths['/api/notifications/unread-count']).toBeTruthy();
    expect(response.body.paths['/api/notifications/settings']).toBeTruthy();
    expect(
      response.body.paths['/api/notifications/settings'].put.requestBody.content[
        'application/json'
      ].schema.additionalProperties
    ).toBe(false);
    expect(response.body.paths['/api/notifications/read-all']).toBeTruthy();
    expect(response.body.paths['/api/notifications/system']).toBeTruthy();
    expect(response.body.paths['/api/notifications/stream']).toBeTruthy();
    expect(response.body.paths['/api/notifications/{id}/read']).toBeTruthy();
    expect(response.body.paths['/api/messages']).toBeTruthy();
    expect(response.body.paths['/api/messages/conversations']).toBeTruthy();
    expect(response.body.paths['/api/messages/conversations/{id}']).toBeTruthy();
    expect(response.body.paths['/api/messages/{id}']).toBeTruthy();
    expect(response.body.paths['/api/search/threads']).toBeTruthy();
    expect(response.body.paths['/api/search/users']).toBeTruthy();
    expect(response.body.paths['/api/users/{id}/follow-status']).toBeTruthy();
    expect(response.body.paths['/api/users/{id}/follow']).toBeTruthy();
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

  it('notifications endpoints should reject unauthorized request', async () => {
    const listResponse = await request(app).get('/api/notifications');
    expect(listResponse.status).toBe(401);

    const unreadCountResponse = await request(app).get('/api/notifications/unread-count');
    expect(unreadCountResponse.status).toBe(401);

    const settingsResponse = await request(app).get('/api/notifications/settings');
    expect(settingsResponse.status).toBe(401);

    const updateSettingsResponse = await request(app)
      .put('/api/notifications/settings')
      .send({ mentionEnabled: false });
    expect(updateSettingsResponse.status).toBe(401);

    const markAllReadResponse = await request(app).post('/api/notifications/read-all');
    expect(markAllReadResponse.status).toBe(401);

    const createSystemResponse = await request(app)
      .post('/api/notifications/system')
      .send({
        userId: 1,
        title: `JEST_system_${nextKey()}`,
      });
    expect(createSystemResponse.status).toBe(401);

    const markReadResponse = await request(app).post('/api/notifications/1/read');
    expect(markReadResponse.status).toBe(401);

    const streamResponse = await request(app).get('/api/notifications/stream');
    expect(streamResponse.status).toBe(401);
  });

  it('follow endpoints should reject unauthorized request', async () => {
    const followResponse = await request(app).post('/api/users/1/follow');
    expect(followResponse.status).toBe(401);

    const unfollowResponse = await request(app).delete('/api/users/1/follow');
    expect(unfollowResponse.status).toBe(401);

    const followStatusResponse = await request(app).get('/api/users/1/follow-status');
    expect(followStatusResponse.status).toBe(401);
  });

  it('messages endpoints should reject unauthorized request', async () => {
    const listConversations = await request(app).get('/api/messages/conversations');
    expect(listConversations.status).toBe(401);

    const listMessages = await request(app).get('/api/messages/conversations/1');
    expect(listMessages.status).toBe(401);

    const sendMessage = await request(app).post('/api/messages').send({
      receiverId: 1,
      content: `JEST_message_unauthorized_${nextKey()}`,
    });
    expect(sendMessage.status).toBe(401);

    const deleteMessage = await request(app).delete('/api/messages/1');
    expect(deleteMessage.status).toBe(401);
  });

  it('forum moderator logs endpoint should reject unauthorized request', async () => {
    const logsResponse = await request(app).get('/api/forums/1/moderator-logs');
    expect(logsResponse.status).toBe(401);
  });

  it('badges endpoints should return catalog and enforce auth for self query', async () => {
    const catalog = await request(app).get('/api/badges');
    expect(catalog.status).toBe(200);
    expect(Array.isArray(catalog.body.data)).toBe(true);
    const slugs = (catalog.body.data as Array<{ slug: string }>).map((item) => item.slug);
    expect(slugs).toContain('first-thread');
    expect(slugs).toContain('first-post');

    const unauthorizedMine = await request(app).get('/api/badges/me');
    expect(unauthorizedMine.status).toBe(401);
  });

  it('points leaderboard endpoints should return paginated ranking data with period filter', async () => {
    const userA = await registerUser(app, 'leaderboard_a');
    const userB = await registerUser(app, 'leaderboard_b');

    const createThread = await request(app)
      .post('/api/threads')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        forumId: 1,
        title: `JEST_leaderboard_thread_${nextKey()}`,
        content: `JEST_leaderboard_content_${nextKey()}`,
      });
    expect(createThread.status).toBe(201);
    const threadId = Number(createThread.body.data.id);

    const createPost = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        threadId,
        content: `JEST_leaderboard_reply_${nextKey()}`,
      });
    expect(createPost.status).toBe(201);

    const signin = await request(app)
      .post('/api/points/me/signin')
      .set('Authorization', `Bearer ${userB.token}`);
    expect(signin.status).toBe(200);

    const pointsBoard = await request(app).get(
      '/api/points/leaderboard?page=1&pageSize=20&period=all'
    );
    expect(pointsBoard.status).toBe(200);
    expect(Array.isArray(pointsBoard.body.data.items)).toBe(true);
    expect(Number(pointsBoard.body.data.page)).toBe(1);
    expect(Number(pointsBoard.body.data.pageSize)).toBe(20);
    const pointsRows = pointsBoard.body.data.items as Array<{
      username: string;
      rank: number;
      experience: number;
      score: number;
      period: string;
    }>;
    const rowA = pointsRows.find((item) => item.username === userA.username);
    const rowB = pointsRows.find((item) => item.username === userB.username);
    expect(rowA).toBeTruthy();
    expect(rowB).toBeTruthy();
    expect(Number(rowA?.rank)).toBeGreaterThanOrEqual(1);
    expect(Number(rowA?.experience)).toBeGreaterThan(Number(rowB?.experience));
    expect(Number(rowA?.score)).toBeGreaterThanOrEqual(Number(rowA?.experience));
    expect(rowA?.period).toBe('all');

    const signinBoard = await request(app).get(
      '/api/points/signin-leaderboard?page=1&pageSize=20&period=all'
    );
    expect(signinBoard.status).toBe(200);
    expect(Array.isArray(signinBoard.body.data.items)).toBe(true);
    const signinRows = signinBoard.body.data.items as Array<{
      username: string;
      rank: number;
      bestStreak: number;
      period: string;
    }>;
    const signinRowB = signinRows.find((item) => item.username === userB.username);
    expect(signinRowB).toBeTruthy();
    expect(Number(signinRowB?.rank)).toBeGreaterThanOrEqual(1);
    expect(Number(signinRowB?.bestStreak)).toBeGreaterThanOrEqual(1);
    expect(signinRowB?.period).toBe('all');

    const pointsBoard7d = await request(app).get(
      '/api/points/leaderboard?page=1&pageSize=20&period=7d'
    );
    expect(pointsBoard7d.status).toBe(200);
    const pointsRows7d = pointsBoard7d.body.data.items as Array<{ period: string; score: number }>;
    expect(pointsRows7d.length).toBeGreaterThan(0);
    expect(pointsRows7d[0].period).toBe('7d');
    expect(Number(pointsRows7d[0].score)).toBeGreaterThan(0);
  });

  it('notifications should support reply mention workflow and mark-as-read', async () => {
    const owner = await registerUser(app, 'notify_owner');
    const replier = await registerUser(app, 'notify_replier');
    const mentioned = await registerUser(app, 'notify_mentioned');

    const createThread = await request(app)
      .post('/api/threads')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        forumId: 1,
        title: `JEST_notify_thread_${nextKey()}`,
        content: `JEST_notify_content_${nextKey()}`,
      });
    expect(createThread.status).toBe(201);
    const threadId = Number(createThread.body.data.id);

    const firstReply = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${replier.token}`)
      .send({
        threadId,
        content: `JEST_notify_reply_${nextKey()} @${mentioned.username}`,
      });
    expect(firstReply.status).toBe(201);
    const firstReplyId = Number(firstReply.body.data.id);

    const ownerReply = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({
        threadId,
        parentId: firstReplyId,
        content: `JEST_notify_owner_reply_${nextKey()}`,
      });
    expect(ownerReply.status).toBe(201);

    const ownerUnreadCount = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${owner.token}`);
    expect(ownerUnreadCount.status).toBe(200);
    expect(Number(ownerUnreadCount.body.data.unreadCount)).toBeGreaterThanOrEqual(1);

    const ownerNotifications = await request(app)
      .get('/api/notifications?page=1&pageSize=20&unreadOnly=true')
      .set('Authorization', `Bearer ${owner.token}`);
    expect(ownerNotifications.status).toBe(200);
    expect(Array.isArray(ownerNotifications.body.data.items)).toBe(true);
    const ownerTypes = (ownerNotifications.body.data.items as Array<{ type: string }>).map(
      (item) => item.type
    );
    expect(ownerTypes).toContain('thread_reply');

    const ownerNotificationId = Number(ownerNotifications.body.data.items[0].id);
    const markRead = await request(app)
      .post(`/api/notifications/${ownerNotificationId}/read`)
      .set('Authorization', `Bearer ${owner.token}`);
    expect(markRead.status).toBe(200);
    expect(markRead.body.data.isRead).toBe(true);

    const mentionedNotifications = await request(app)
      .get('/api/notifications?page=1&pageSize=20')
      .set('Authorization', `Bearer ${mentioned.token}`);
    expect(mentionedNotifications.status).toBe(200);
    const mentionedItems = mentionedNotifications.body.data.items as Array<{
      type: string;
      relatedType: string | null;
      relatedId: number | null;
    }>;
    const mentionedTypes = mentionedItems.map((item) => item.type);
    expect(mentionedTypes).toContain('mention');
    const mentionItem = mentionedItems.find((item) => item.type === 'mention');
    expect(mentionItem).toBeTruthy();
    expect(mentionItem?.relatedType).toBe('thread');
    expect(Number(mentionItem?.relatedId)).toBe(threadId);

    const replierNotifications = await request(app)
      .get('/api/notifications?page=1&pageSize=20')
      .set('Authorization', `Bearer ${replier.token}`);
    expect(replierNotifications.status).toBe(200);
    const replierItems = replierNotifications.body.data.items as Array<{
      type: string;
      relatedType: string | null;
      relatedId: number | null;
    }>;
    const replierTypes = replierItems.map((item) => item.type);
    expect(replierTypes).toContain('post_reply');
    const postReplyItem = replierItems.find((item) => item.type === 'post_reply');
    expect(postReplyItem).toBeTruthy();
    expect(postReplyItem?.relatedType).toBe('thread');
    expect(Number(postReplyItem?.relatedId)).toBe(threadId);

    const markAllMentioned = await request(app)
      .post('/api/notifications/read-all')
      .set('Authorization', `Bearer ${mentioned.token}`);
    expect(markAllMentioned.status).toBe(200);
    expect(Number(markAllMentioned.body.data.updated)).toBeGreaterThanOrEqual(1);
    expect(Number(markAllMentioned.body.data.unreadCount)).toBe(0);

    const mentionedUnreadAfter = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${mentioned.token}`);
    expect(mentionedUnreadAfter.status).toBe(200);
    expect(Number(mentionedUnreadAfter.body.data.unreadCount)).toBe(0);
  });

  it('system notifications should require admin role and be delivered to target user', async () => {
    const adminCandidate = await registerUser(app, 'notify_admin');
    const target = await registerUser(app, 'notify_system_target');

    const forbiddenCreate = await request(app)
      .post('/api/notifications/system')
      .set('Authorization', `Bearer ${adminCandidate.token}`)
      .send({
        userId: target.userId,
        title: `JEST_system_forbidden_${nextKey()}`,
      });
    expect(forbiddenCreate.status).toBe(403);

    getDatabase()
      .prepare('UPDATE users SET role = ? WHERE id = ?')
      .run('admin', adminCandidate.userId);
    const adminToken = await loginUser(app, adminCandidate.username);

    const createSystem = await request(app)
      .post('/api/notifications/system')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: target.userId,
        title: `JEST_system_title_${nextKey()}`,
        content: `JEST_system_content_${nextKey()}`,
      });
    expect(createSystem.status).toBe(201);
    expect(Number(createSystem.body.data.notificationId)).toBeGreaterThan(0);

    const targetNotifications = await request(app)
      .get('/api/notifications?page=1&pageSize=20')
      .set('Authorization', `Bearer ${target.token}`);
    expect(targetNotifications.status).toBe(200);
    const systemItem = (
      targetNotifications.body.data.items as Array<{ type: string; title: string }>
    ).find((item) => item.type === 'system');
    expect(systemItem).toBeTruthy();
    expect(systemItem?.title).toContain('JEST_system_title_');
  });

  it('follow and unfollow should update status and create follow notification', async () => {
    const follower = await registerUser(app, 'follow_follower');
    const target = await registerUser(app, 'follow_target');

    const followSelf = await request(app)
      .post(`/api/users/${follower.userId}/follow`)
      .set('Authorization', `Bearer ${follower.token}`);
    expect(followSelf.status).toBe(400);

    const follow = await request(app)
      .post(`/api/users/${target.userId}/follow`)
      .set('Authorization', `Bearer ${follower.token}`);
    expect(follow.status).toBe(200);
    expect(follow.body.data.following).toBe(true);
    expect(Number(follow.body.data.followerCount)).toBeGreaterThanOrEqual(1);

    const followStatus = await request(app)
      .get(`/api/users/${target.userId}/follow-status`)
      .set('Authorization', `Bearer ${follower.token}`);
    expect(followStatus.status).toBe(200);
    expect(followStatus.body.data.following).toBe(true);

    const targetNotifications = await request(app)
      .get('/api/notifications?page=1&pageSize=20')
      .set('Authorization', `Bearer ${target.token}`);
    expect(targetNotifications.status).toBe(200);
    const followItem = (
      targetNotifications.body.data.items as Array<{
        type: string;
        relatedType: string | null;
        relatedId: number | null;
      }>
    ).find((item) => item.type === 'follow');
    expect(followItem).toBeTruthy();
    expect(followItem?.relatedType).toBe('user');
    expect(Number(followItem?.relatedId)).toBe(follower.userId);

    const unfollow = await request(app)
      .delete(`/api/users/${target.userId}/follow`)
      .set('Authorization', `Bearer ${follower.token}`);
    expect(unfollow.status).toBe(200);
    expect(unfollow.body.data.following).toBe(false);

    const followStatusAfter = await request(app)
      .get(`/api/users/${target.userId}/follow-status`)
      .set('Authorization', `Bearer ${follower.token}`);
    expect(followStatusAfter.status).toBe(200);
    expect(followStatusAfter.body.data.following).toBe(false);
  });

  it('notification settings should update and control follow notifications', async () => {
    const target = await registerUser(app, 'settings_target');
    const follower = await registerUser(app, 'settings_follower');

    const defaultSettings = await request(app)
      .get('/api/notifications/settings')
      .set('Authorization', `Bearer ${target.token}`);
    expect(defaultSettings.status).toBe(200);
    expect(defaultSettings.body.data.followEnabled).toBe(true);

    const disableFollow = await request(app)
      .put('/api/notifications/settings')
      .set('Authorization', `Bearer ${target.token}`)
      .send({
        followEnabled: false,
        dndEnabled: false,
      });
    expect(disableFollow.status).toBe(200);
    expect(disableFollow.body.data.followEnabled).toBe(false);

    const firstFollow = await request(app)
      .post(`/api/users/${target.userId}/follow`)
      .set('Authorization', `Bearer ${follower.token}`);
    expect(firstFollow.status).toBe(200);

    const notificationsAfterDisabledFollow = await request(app)
      .get('/api/notifications?page=1&pageSize=20')
      .set('Authorization', `Bearer ${target.token}`);
    expect(notificationsAfterDisabledFollow.status).toBe(200);
    const disabledFollowItem = (
      notificationsAfterDisabledFollow.body.data.items as Array<{ type: string }>
    ).find((item) => item.type === 'follow');
    expect(disabledFollowItem).toBeFalsy();

    const enableFollow = await request(app)
      .put('/api/notifications/settings')
      .set('Authorization', `Bearer ${target.token}`)
      .send({
        followEnabled: true,
      });
    expect(enableFollow.status).toBe(200);
    expect(enableFollow.body.data.followEnabled).toBe(true);

    const unfollow = await request(app)
      .delete(`/api/users/${target.userId}/follow`)
      .set('Authorization', `Bearer ${follower.token}`);
    expect(unfollow.status).toBe(200);

    const secondFollow = await request(app)
      .post(`/api/users/${target.userId}/follow`)
      .set('Authorization', `Bearer ${follower.token}`);
    expect(secondFollow.status).toBe(200);

    const notificationsAfterEnabledFollow = await request(app)
      .get('/api/notifications?page=1&pageSize=20')
      .set('Authorization', `Bearer ${target.token}`);
    expect(notificationsAfterEnabledFollow.status).toBe(200);
    const enabledFollowItem = (
      notificationsAfterEnabledFollow.body.data.items as Array<{ type: string }>
    ).find((item) => item.type === 'follow');
    expect(enabledFollowItem).toBeTruthy();
  });

  it('notification settings should reject invalid DND hour values', async () => {
    const user = await registerUser(app, 'settings_invalid_dnd');

    const invalidStartLow = await request(app)
      .put('/api/notifications/settings')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ dndStartHour: -1 });
    expect(invalidStartLow.status).toBe(400);
    expect(invalidStartLow.body.success).toBe(false);

    const invalidStartHigh = await request(app)
      .put('/api/notifications/settings')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ dndStartHour: 24 });
    expect(invalidStartHigh.status).toBe(400);
    expect(invalidStartHigh.body.success).toBe(false);

    const invalidEndLow = await request(app)
      .put('/api/notifications/settings')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ dndEndHour: -1 });
    expect(invalidEndLow.status).toBe(400);
    expect(invalidEndLow.body.success).toBe(false);

    const invalidEndHigh = await request(app)
      .put('/api/notifications/settings')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ dndEndHour: 24 });
    expect(invalidEndHigh.status).toBe(400);
    expect(invalidEndHigh.body.success).toBe(false);
  });

  it('notification settings should reject invalid boolean values', async () => {
    const user = await registerUser(app, 'settings_invalid_bool');

    const invalidMention = await request(app)
      .put('/api/notifications/settings')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ mentionEnabled: 'invalid' });
    expect(invalidMention.status).toBe(400);
    expect(invalidMention.body.success).toBe(false);

    const invalidFollow = await request(app)
      .put('/api/notifications/settings')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ followEnabled: 'nope' });
    expect(invalidFollow.status).toBe(400);
    expect(invalidFollow.body.success).toBe(false);

    const invalidDnd = await request(app)
      .put('/api/notifications/settings')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ dndEnabled: 'invalid' });
    expect(invalidDnd.status).toBe(400);
    expect(invalidDnd.body.success).toBe(false);
  });

  it('notification settings should reject boolean-like string values', async () => {
    const user = await registerUser(app, 'settings_bool_like_string');

    const updateWithStrings = await request(app)
      .put('/api/notifications/settings')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        mentionEnabled: 'false',
        followEnabled: 'false',
        dndEnabled: 'true',
      });
    expect(updateWithStrings.status).toBe(400);
    expect(updateWithStrings.body.success).toBe(false);
  });

  it('notification settings should reject string hour values', async () => {
    const user = await registerUser(app, 'settings_string_hour');

    const invalidStartHourString = await request(app)
      .put('/api/notifications/settings')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ dndStartHour: '12' });
    expect(invalidStartHourString.status).toBe(400);
    expect(invalidStartHourString.body.success).toBe(false);

    const invalidEndHourString = await request(app)
      .put('/api/notifications/settings')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ dndEndHour: '12' });
    expect(invalidEndHourString.status).toBe(400);
    expect(invalidEndHourString.body.success).toBe(false);
  });

  it('notification settings update should be idempotent with empty body', async () => {
    const user = await registerUser(app, 'settings_empty_patch');

    const beforeUpdate = await request(app)
      .get('/api/notifications/settings')
      .set('Authorization', `Bearer ${user.token}`);
    expect(beforeUpdate.status).toBe(200);

    const updateWithEmptyBody = await request(app)
      .put('/api/notifications/settings')
      .set('Authorization', `Bearer ${user.token}`)
      .send({});
    expect(updateWithEmptyBody.status).toBe(200);
    expect(updateWithEmptyBody.body.success).toBe(true);

    const afterUpdate = await request(app)
      .get('/api/notifications/settings')
      .set('Authorization', `Bearer ${user.token}`);
    expect(afterUpdate.status).toBe(200);

    expect(afterUpdate.body.data.threadReplyEnabled).toBe(
      beforeUpdate.body.data.threadReplyEnabled
    );
    expect(afterUpdate.body.data.postReplyEnabled).toBe(
      beforeUpdate.body.data.postReplyEnabled
    );
    expect(afterUpdate.body.data.mentionEnabled).toBe(beforeUpdate.body.data.mentionEnabled);
    expect(afterUpdate.body.data.postLikedEnabled).toBe(
      beforeUpdate.body.data.postLikedEnabled
    );
    expect(afterUpdate.body.data.followEnabled).toBe(beforeUpdate.body.data.followEnabled);
    expect(afterUpdate.body.data.systemEnabled).toBe(beforeUpdate.body.data.systemEnabled);
    expect(afterUpdate.body.data.dndEnabled).toBe(beforeUpdate.body.data.dndEnabled);
    expect(Number(afterUpdate.body.data.dndStartHour)).toBe(
      Number(beforeUpdate.body.data.dndStartHour)
    );
    expect(Number(afterUpdate.body.data.dndEndHour)).toBe(
      Number(beforeUpdate.body.data.dndEndHour)
    );
  });

  it('notification settings update should reject unknown fields', async () => {
    const user = await registerUser(app, 'settings_unknown_field');

    const beforeUpdate = await request(app)
      .get('/api/notifications/settings')
      .set('Authorization', `Bearer ${user.token}`);
    expect(beforeUpdate.status).toBe(200);

    const updateWithUnknownField = await request(app)
      .put('/api/notifications/settings')
      .set('Authorization', `Bearer ${user.token}`)
      .send({
        unknownKey: 'JEST_unknown_value',
      });
    expect(updateWithUnknownField.status).toBe(400);
    expect(updateWithUnknownField.body.success).toBe(false);

    const afterUpdate = await request(app)
      .get('/api/notifications/settings')
      .set('Authorization', `Bearer ${user.token}`);
    expect(afterUpdate.status).toBe(200);

    expect(afterUpdate.body.data.threadReplyEnabled).toBe(
      beforeUpdate.body.data.threadReplyEnabled
    );
    expect(afterUpdate.body.data.postReplyEnabled).toBe(
      beforeUpdate.body.data.postReplyEnabled
    );
    expect(afterUpdate.body.data.mentionEnabled).toBe(beforeUpdate.body.data.mentionEnabled);
    expect(afterUpdate.body.data.postLikedEnabled).toBe(
      beforeUpdate.body.data.postLikedEnabled
    );
    expect(afterUpdate.body.data.followEnabled).toBe(beforeUpdate.body.data.followEnabled);
    expect(afterUpdate.body.data.systemEnabled).toBe(beforeUpdate.body.data.systemEnabled);
    expect(afterUpdate.body.data.dndEnabled).toBe(beforeUpdate.body.data.dndEnabled);
    expect(Number(afterUpdate.body.data.dndStartHour)).toBe(
      Number(beforeUpdate.body.data.dndStartHour)
    );
    expect(Number(afterUpdate.body.data.dndEndHour)).toBe(
      Number(beforeUpdate.body.data.dndEndHour)
    );
  });

  it('notification settings update should reject non-object request body', async () => {
    const user = await registerUser(app, 'settings_non_object_body');

    const arrayBody = await request(app)
      .put('/api/notifications/settings')
      .set('Authorization', `Bearer ${user.token}`)
      .send([]);
    expect(arrayBody.status).toBe(400);
    expect(arrayBody.body.success).toBe(false);

    const stringBody = await request(app)
      .put('/api/notifications/settings')
      .set('Authorization', `Bearer ${user.token}`)
      .set('Content-Type', 'application/json')
      .send('"invalid-body"');
    expect(stringBody.status).toBe(400);
    expect(stringBody.body.success).toBe(false);
  });

  it('notification settings DND full-day should mute follow notifications but keep system notifications', async () => {
    const target = await registerUser(app, 'settings_dnd_target');
    const follower = await registerUser(app, 'settings_dnd_follower');
    const adminCandidate = await registerUser(app, 'settings_dnd_admin');

    getDatabase()
      .prepare('UPDATE users SET role = ? WHERE id = ?')
      .run('admin', adminCandidate.userId);
    const adminToken = await loginUser(app, adminCandidate.username);

    const enableFullDayDnd = await request(app)
      .put('/api/notifications/settings')
      .set('Authorization', `Bearer ${target.token}`)
      .send({
        followEnabled: true,
        dndEnabled: true,
        dndStartHour: 0,
        dndEndHour: 0,
      });
    expect(enableFullDayDnd.status).toBe(200);
    expect(enableFullDayDnd.body.data.followEnabled).toBe(true);
    expect(enableFullDayDnd.body.data.dndEnabled).toBe(true);
    expect(Number(enableFullDayDnd.body.data.dndStartHour)).toBe(0);
    expect(Number(enableFullDayDnd.body.data.dndEndHour)).toBe(0);

    const followUnderDnd = await request(app)
      .post(`/api/users/${target.userId}/follow`)
      .set('Authorization', `Bearer ${follower.token}`);
    expect(followUnderDnd.status).toBe(200);

    const notificationsAfterFollow = await request(app)
      .get('/api/notifications?page=1&pageSize=20')
      .set('Authorization', `Bearer ${target.token}`);
    expect(notificationsAfterFollow.status).toBe(200);
    const followItemUnderDnd = (
      notificationsAfterFollow.body.data.items as Array<{ type: string }>
    ).find((item) => item.type === 'follow');
    expect(followItemUnderDnd).toBeFalsy();

    const unreadAfterFollow = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${target.token}`);
    expect(unreadAfterFollow.status).toBe(200);
    expect(Number(unreadAfterFollow.body.data.unreadCount)).toBe(0);

    const createSystem = await request(app)
      .post('/api/notifications/system')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: target.userId,
        title: `JEST_dnd_system_title_${nextKey()}`,
        content: `JEST_dnd_system_content_${nextKey()}`,
      });
    expect(createSystem.status).toBe(201);

    const notificationsAfterSystem = await request(app)
      .get('/api/notifications?page=1&pageSize=20')
      .set('Authorization', `Bearer ${target.token}`);
    expect(notificationsAfterSystem.status).toBe(200);
    const systemItemUnderDnd = (
      notificationsAfterSystem.body.data.items as Array<{ type: string; title: string }>
    ).find((item) => item.type === 'system');
    expect(systemItemUnderDnd).toBeTruthy();
    expect(systemItemUnderDnd?.title).toContain('JEST_dnd_system_title_');

    const unreadAfterSystem = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${target.token}`);
    expect(unreadAfterSystem.status).toBe(200);
    expect(Number(unreadAfterSystem.body.data.unreadCount)).toBeGreaterThanOrEqual(1);
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

    const myBadges = await request(app)
      .get('/api/badges/me')
      .set('Authorization', `Bearer ${user.token}`);
    expect(myBadges.status).toBe(200);
    const myBadgeSlugs = (myBadges.body.data as Array<{ slug: string }>).map((item) => item.slug);
    expect(myBadgeSlugs).toContain('first-thread');
    expect(myBadgeSlugs).toContain('first-post');

    const publicBadges = await request(app).get(`/api/users/${user.userId}/badges`);
    expect(publicBadges.status).toBe(200);
    const publicBadgeSlugs = (publicBadges.body.data as Array<{ slug: string }>).map(
      (item) => item.slug
    );
    expect(publicBadgeSlugs).toContain('first-thread');
    expect(publicBadgeSlugs).toContain('first-post');
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

  it('signin streak should unlock 7-day badge', async () => {
    const user = await registerUser(app, 'signin_streak');

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    getDatabase()
      .prepare(
        `INSERT INTO daily_signins (user_id, sign_date, streak, points_awarded)
         VALUES (?, ?, ?, ?)`
      )
      .run(user.userId, yesterday, 6, 4);

    const signin = await request(app)
      .post('/api/points/me/signin')
      .set('Authorization', `Bearer ${user.token}`);
    expect(signin.status).toBe(200);
    expect(Number(signin.body.data.streak)).toBe(7);

    const myBadges = await request(app)
      .get('/api/badges/me')
      .set('Authorization', `Bearer ${user.token}`);
    expect(myBadges.status).toBe(200);
    const slugs = (myBadges.body.data as Array<{ slug: string }>).map((item) => item.slug);
    expect(slugs).toContain('signin-streak-7');

    const signinBoard = await request(app).get(
      '/api/points/signin-leaderboard?page=1&pageSize=20&period=all'
    );
    expect(signinBoard.status).toBe(200);
    const row = (
      signinBoard.body.data.items as Array<{ username: string; bestStreak: number }>
    ).find((item) => item.username === user.username);
    expect(row).toBeTruthy();
    expect(Number(row?.bestStreak)).toBeGreaterThanOrEqual(7);
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

  it('forum moderator endpoints should enforce admin permission and support assign/list/remove', async () => {
    const adminCandidate = await registerUser(app, 'mod_admin');
    const moderatorUser = await registerUser(app, 'mod_target');

    const unauthorizedAssign = await request(app).post('/api/forums/1/moderators').send({
      userId: moderatorUser.userId,
    });
    expect(unauthorizedAssign.status).toBe(401);

    const forbiddenAssign = await request(app)
      .post('/api/forums/1/moderators')
      .set('Authorization', `Bearer ${adminCandidate.token}`)
      .send({
        userId: moderatorUser.userId,
      });
    expect(forbiddenAssign.status).toBe(403);

    const adminToken = await promoteToAdminAndLogin(app, adminCandidate.userId, adminCandidate.username);

    const assign = await request(app)
      .post('/api/forums/1/moderators')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: moderatorUser.userId,
      });
    expect(assign.status).toBe(201);
    expect(Number(assign.body.data.userId)).toBe(moderatorUser.userId);

    const duplicateAssign = await request(app)
      .post('/api/forums/1/moderators')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: moderatorUser.userId,
      });
    expect(duplicateAssign.status).toBe(409);

    const listModerators = await request(app).get('/api/forums/1/moderators');
    expect(listModerators.status).toBe(200);
    const assigned = (listModerators.body.data as Array<{ userId: number }>).find(
      (item) => Number(item.userId) === moderatorUser.userId
    );
    expect(assigned).toBeTruthy();

    const removeForbidden = await request(app)
      .delete(`/api/forums/1/moderators/${moderatorUser.userId}`)
      .set('Authorization', `Bearer ${moderatorUser.token}`);
    expect(removeForbidden.status).toBe(403);

    const remove = await request(app)
      .delete(`/api/forums/1/moderators/${moderatorUser.userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(remove.status).toBe(200);
    expect(remove.body.data.removed).toBe(true);

    const removeAgain = await request(app)
      .delete(`/api/forums/1/moderators/${moderatorUser.userId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(removeAgain.status).toBe(404);
  });

  it('thread moderation endpoints should allow moderator/admin and reject non-moderators', async () => {
    const adminCandidate = await registerUser(app, 'thread_mod_admin');
    const moderatorUser = await registerUser(app, 'thread_mod_actor');
    const normalUser = await registerUser(app, 'thread_mod_normal');
    const author = await registerUser(app, 'thread_mod_author');

    const createThread = await request(app)
      .post('/api/threads')
      .set('Authorization', `Bearer ${author.token}`)
      .send({
        forumId: 1,
        title: `JEST_thread_mod_${nextKey()}`,
        content: `JEST_thread_mod_content_${nextKey()}`,
      });
    expect(createThread.status).toBe(201);
    const threadId = Number(createThread.body.data.id);

    const forbiddenModeration = await request(app)
      .patch(`/api/threads/${threadId}/moderation`)
      .set('Authorization', `Bearer ${normalUser.token}`)
      .send({
        isPinned: true,
      });
    expect(forbiddenModeration.status).toBe(403);

    const adminToken = await promoteToAdminAndLogin(app, adminCandidate.userId, adminCandidate.username);

    const assignModerator = await request(app)
      .post('/api/forums/1/moderators')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: moderatorUser.userId,
      });
    expect(assignModerator.status).toBe(201);

    const moderatorUpdate = await request(app)
      .patch(`/api/threads/${threadId}/moderation`)
      .set('Authorization', `Bearer ${moderatorUser.token}`)
      .send({
        isPinned: true,
        isLocked: true,
        isEssence: true,
      });
    expect(moderatorUpdate.status).toBe(200);
    expect(moderatorUpdate.body.data.isPinned).toBe(true);
    expect(moderatorUpdate.body.data.isLocked).toBe(true);
    expect(moderatorUpdate.body.data.isEssence).toBe(true);

    const validateMissingFields = await request(app)
      .patch(`/api/threads/${threadId}/moderation`)
      .set('Authorization', `Bearer ${moderatorUser.token}`)
      .send({});
    expect(validateMissingFields.status).toBe(400);

    const actionLogRow = getDatabase()
      .prepare(
        `SELECT action FROM moderator_action_logs
         WHERE thread_id = ?
         ORDER BY id DESC
         LIMIT 1`
      )
      .get(threadId) as { action: string } | undefined;
    expect(actionLogRow).toBeTruthy();
    expect(actionLogRow?.action).toBe('thread_moderation_update');

    const moderatorLogs = await request(app)
      .get('/api/forums/1/moderator-logs?page=1&pageSize=20')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(moderatorLogs.status).toBe(200);
    const logItems = moderatorLogs.body.data.items as Array<{ action: string; threadId: number }>;
    expect(logItems.some((item) => item.action === 'thread_moderation_update')).toBe(true);
    expect(logItems.some((item) => Number(item.threadId) === threadId)).toBe(true);

    const moderatorLogsAsModerator = await request(app)
      .get('/api/forums/1/moderator-logs?page=1&pageSize=20')
      .set('Authorization', `Bearer ${moderatorUser.token}`);
    expect(moderatorLogsAsModerator.status).toBe(200);
  });

  it('thread move endpoint should allow moderators to move and reject non-moderators', async () => {
    const adminCandidate = await registerUser(app, 'thread_move_admin');
    const moderatorUser = await registerUser(app, 'thread_move_actor');
    const normalUser = await registerUser(app, 'thread_move_normal');
    const author = await registerUser(app, 'thread_move_author');

    const forumsResponse = await request(app).get('/api/forums');
    expect(forumsResponse.status).toBe(200);
    const forums = forumsResponse.body.data as Array<{ id: number }>;
    expect(forums.length).toBeGreaterThanOrEqual(2);
    const sourceForumId = Number(forums[0].id);
    const targetForumId = Number(forums.find((forum) => Number(forum.id) !== sourceForumId)?.id);
    expect(targetForumId).toBeGreaterThan(0);

    const createThread = await request(app)
      .post('/api/threads')
      .set('Authorization', `Bearer ${author.token}`)
      .send({
        forumId: sourceForumId,
        title: `JEST_thread_move_${nextKey()}`,
        content: `JEST_thread_move_content_${nextKey()}`,
      });
    expect(createThread.status).toBe(201);
    const threadId = Number(createThread.body.data.id);

    const forbiddenMove = await request(app)
      .post(`/api/threads/${threadId}/move`)
      .set('Authorization', `Bearer ${normalUser.token}`)
      .send({
        targetForumId,
      });
    expect(forbiddenMove.status).toBe(403);

    const adminToken = await promoteToAdminAndLogin(app, adminCandidate.userId, adminCandidate.username);
    const assignModerator = await request(app)
      .post(`/api/forums/${sourceForumId}/moderators`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        userId: moderatorUser.userId,
      });
    expect(assignModerator.status).toBe(201);

    const move = await request(app)
      .post(`/api/threads/${threadId}/move`)
      .set('Authorization', `Bearer ${moderatorUser.token}`)
      .send({
        targetForumId,
      });
    expect(move.status).toBe(200);
    expect(Number(move.body.data.forumId)).toBe(targetForumId);

    const moveSameForum = await request(app)
      .post(`/api/threads/${threadId}/move`)
      .set('Authorization', `Bearer ${moderatorUser.token}`)
      .send({
        targetForumId,
      });
    expect(moveSameForum.status).toBe(400);

    const movedThread = await request(app).get(`/api/threads/${threadId}`);
    expect(movedThread.status).toBe(200);
    expect(Number(movedThread.body.data.forum.id)).toBe(targetForumId);

    const actionLogRow = getDatabase()
      .prepare(
        `SELECT action FROM moderator_action_logs
         WHERE thread_id = ?
         ORDER BY id DESC
         LIMIT 1`
      )
      .get(threadId) as { action: string } | undefined;
    expect(actionLogRow).toBeTruthy();
    expect(actionLogRow?.action).toBe('thread_move');
  });

  it('private message workflow should support send/list/read/delete visibility', async () => {
    const sender = await registerUser(app, 'msg_sender');
    const receiver = await registerUser(app, 'msg_receiver');
    const outsider = await registerUser(app, 'msg_outsider');

    const sendFirst = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${sender.token}`)
      .send({
        receiverId: receiver.userId,
        content: `JEST_msg_first_${nextKey()}`,
      });
    expect(sendFirst.status).toBe(201);
    const firstMessageId = Number(sendFirst.body.data.id);
    const conversationId = Number(sendFirst.body.data.conversationId);
    expect(conversationId).toBeGreaterThan(0);

    const sendSelf = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${sender.token}`)
      .send({
        receiverId: sender.userId,
        content: `JEST_msg_self_${nextKey()}`,
      });
    expect(sendSelf.status).toBe(400);

    const receiverConversationsBeforeRead = await request(app)
      .get('/api/messages/conversations?page=1&pageSize=20')
      .set('Authorization', `Bearer ${receiver.token}`);
    expect(receiverConversationsBeforeRead.status).toBe(200);
    const receiverConversation = (
      receiverConversationsBeforeRead.body.data.items as Array<{
        id: number;
        peerUser: { id: number };
        unreadCount: number;
      }>
    ).find((item) => Number(item.peerUser.id) === sender.userId);
    expect(receiverConversation).toBeTruthy();
    expect(Number(receiverConversation?.unreadCount)).toBeGreaterThanOrEqual(1);

    const forbiddenConversationRead = await request(app)
      .get(`/api/messages/conversations/${conversationId}`)
      .set('Authorization', `Bearer ${outsider.token}`);
    expect(forbiddenConversationRead.status).toBe(403);

    const receiverMessages = await request(app)
      .get(`/api/messages/conversations/${conversationId}?page=1&pageSize=20`)
      .set('Authorization', `Bearer ${receiver.token}`);
    expect(receiverMessages.status).toBe(200);
    expect(Number(receiverMessages.body.data.total)).toBeGreaterThanOrEqual(1);
    const firstMessage = (
      receiverMessages.body.data.items as Array<{ id: number; content: string; isRead: boolean }>
    ).find((item) => item.id === firstMessageId);
    expect(firstMessage).toBeTruthy();
    expect(firstMessage?.content).toContain('JEST_msg_first_');
    expect(firstMessage?.isRead).toBe(true);

    const receiverConversationsAfterRead = await request(app)
      .get('/api/messages/conversations?page=1&pageSize=20')
      .set('Authorization', `Bearer ${receiver.token}`);
    expect(receiverConversationsAfterRead.status).toBe(200);
    const receiverConversationAfterRead = (
      receiverConversationsAfterRead.body.data.items as Array<{ id: number; unreadCount: number }>
    ).find((item) => Number(item.id) === conversationId);
    expect(receiverConversationAfterRead).toBeTruthy();
    expect(Number(receiverConversationAfterRead?.unreadCount)).toBe(0);

    const reply = await request(app)
      .post('/api/messages')
      .set('Authorization', `Bearer ${receiver.token}`)
      .send({
        receiverId: sender.userId,
        content: `JEST_msg_reply_${nextKey()}`,
      });
    expect(reply.status).toBe(201);
    expect(Number(reply.body.data.conversationId)).toBe(conversationId);

    const senderDelete = await request(app)
      .delete(`/api/messages/${firstMessageId}`)
      .set('Authorization', `Bearer ${sender.token}`);
    expect(senderDelete.status).toBe(200);
    expect(senderDelete.body.data.deleted).toBe(true);

    const senderMessagesAfterDelete = await request(app)
      .get(`/api/messages/conversations/${conversationId}?page=1&pageSize=20`)
      .set('Authorization', `Bearer ${sender.token}`);
    expect(senderMessagesAfterDelete.status).toBe(200);
    const senderHasFirst = (
      senderMessagesAfterDelete.body.data.items as Array<{ id: number }>
    ).some((item) => Number(item.id) === firstMessageId);
    expect(senderHasFirst).toBe(false);

    const receiverMessagesAfterSenderDelete = await request(app)
      .get(`/api/messages/conversations/${conversationId}?page=1&pageSize=20`)
      .set('Authorization', `Bearer ${receiver.token}`);
    expect(receiverMessagesAfterSenderDelete.status).toBe(200);
    const receiverHasFirst = (
      receiverMessagesAfterSenderDelete.body.data.items as Array<{ id: number }>
    ).some((item) => Number(item.id) === firstMessageId);
    expect(receiverHasFirst).toBe(true);
  });

  it('search endpoints should return thread/user matches and support forum filter', async () => {
    const author = await registerUser(app, 'search_author');
    const other = await registerUser(app, 'search_other');
    const forumsResponse = await request(app).get('/api/forums');
    expect(forumsResponse.status).toBe(200);
    const forums = forumsResponse.body.data as Array<{ id: number }>;
    expect(forums.length).toBeGreaterThanOrEqual(2);
    const forumA = Number(forums[0].id);
    const forumB = Number(forums.find((forum) => Number(forum.id) !== forumA)?.id);
    expect(forumB).toBeGreaterThan(0);

    const threadKeyword = `JEST_SEARCH_THREAD_${nextKey()}`;
    const userKeyword = `JEST_SEARCH_USER_${nextKey()}`;

    const updateAuthor = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${author.token}`)
      .send({
        bio: `Author bio ${userKeyword}`,
      });
    expect(updateAuthor.status).toBe(200);

    const createThreadA = await request(app)
      .post('/api/threads')
      .set('Authorization', `Bearer ${author.token}`)
      .send({
        forumId: forumA,
        title: `${threadKeyword}_A`,
        content: `Content ${threadKeyword}_A`,
      });
    expect(createThreadA.status).toBe(201);

    const createThreadB = await request(app)
      .post('/api/threads')
      .set('Authorization', `Bearer ${other.token}`)
      .send({
        forumId: forumB,
        title: `${threadKeyword}_B`,
        content: `Content ${threadKeyword}_B`,
      });
    expect(createThreadB.status).toBe(201);

    const searchThreads = await request(app).get(
      `/api/search/threads?q=${encodeURIComponent(threadKeyword)}&page=1&pageSize=20`
    );
    expect(searchThreads.status).toBe(200);
    const threadItems = searchThreads.body.data.items as Array<{ forumId: number; title: string }>;
    expect(threadItems.length).toBeGreaterThanOrEqual(2);
    expect(threadItems.some((item) => item.title.includes(threadKeyword))).toBe(true);

    const searchThreadsForumFilter = await request(app).get(
      `/api/search/threads?q=${encodeURIComponent(threadKeyword)}&forumId=${forumA}&page=1&pageSize=20`
    );
    expect(searchThreadsForumFilter.status).toBe(200);
    const filteredItems = searchThreadsForumFilter.body.data.items as Array<{ forumId: number }>;
    expect(filteredItems.length).toBeGreaterThanOrEqual(1);
    expect(filteredItems.every((item) => Number(item.forumId) === forumA)).toBe(true);

    const searchUsers = await request(app).get(
      `/api/search/users?q=${encodeURIComponent(userKeyword)}&page=1&pageSize=20`
    );
    expect(searchUsers.status).toBe(200);
    const userItems = searchUsers.body.data.items as Array<{ id: number; username: string }>;
    const foundAuthor = userItems.find((item) => Number(item.id) === author.userId);
    expect(foundAuthor).toBeTruthy();

    const invalidThreadSearch = await request(app).get('/api/search/threads?q=');
    expect(invalidThreadSearch.status).toBe(400);

    const invalidUserSearch = await request(app).get('/api/search/users');
    expect(invalidUserSearch.status).toBe(400);
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

    const unauthorizedLike = await request(app).post(`/api/posts/${firstPostId}/like`);
    expect(unauthorizedLike.status).toBe(401);

    const likeResponse = await request(app)
      .post(`/api/posts/${firstPostId}/like`)
      .set('Authorization', `Bearer ${author.token}`);
    expect(likeResponse.status).toBe(200);
    expect(Number(likeResponse.body.data.likeCount)).toBeGreaterThanOrEqual(1);

    const replierNotifications = await request(app)
      .get('/api/notifications?page=1&pageSize=20')
      .set('Authorization', `Bearer ${replier.token}`);
    expect(replierNotifications.status).toBe(200);
    const likedItem = (
      replierNotifications.body.data.items as Array<{
        type: string;
        relatedType: string | null;
        relatedId: number | null;
      }>
    ).find((item) => item.type === 'post_liked');
    expect(likedItem).toBeTruthy();
    expect(likedItem?.relatedType).toBe('thread');
    expect(Number(likedItem?.relatedId)).toBe(threadId);

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

import { Router } from 'express';
import { forumService } from '../services/forumService';
import { sendSuccess } from '../utils/apiResponse';

const router = Router();

router.get('/categories', (_req, res, next) => {
  try {
    const categories = forumService.getCategories();
    return sendSuccess(res, categories, '获取分类成功');
  } catch (error) {
    return next(error);
  }
});

router.get('/forums', (_req, res, next) => {
  try {
    const forums = forumService.getForums();
    return sendSuccess(res, forums, '获取板块成功');
  } catch (error) {
    return next(error);
  }
});

router.get('/forums/:id', (req, res, next) => {
  try {
    const forumId = Number(req.params.id);
    const forum = forumService.getForumById(forumId);
    return sendSuccess(res, forum, '获取板块详情成功');
  } catch (error) {
    return next(error);
  }
});

router.get('/forums/:id/threads', (req, res, next) => {
  try {
    const forumId = Number(req.params.id);
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const result = forumService.getForumThreads(forumId, page, pageSize);
    return sendSuccess(res, result, '获取主题列表成功');
  } catch (error) {
    return next(error);
  }
});

export default router;

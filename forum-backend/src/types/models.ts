export interface AuthUser {
  id: number;
  username: string;
  role: string;
}

export interface PublicUser {
  id: number;
  username: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  role: string;
  level: number;
  experience: number;
  postCount: number;
  threadCount: number;
  createdAt: string;
}

export interface ForumCategory {
  id: number;
  name: string;
  icon: string | null;
  sortOrder: number;
  forumCount: number;
}

export interface ForumItem {
  id: number;
  categoryId: number;
  categoryName: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  threadCount: number;
  postCount: number;
  lastThreadId: number | null;
  lastPostTime: string | null;
  sortOrder: number;
}

export interface ThreadSummary {
  id: number;
  forumId: number;
  title: string;
  excerpt: string;
  type: string;
  isPinned: boolean;
  isLocked: boolean;
  isEssence: boolean;
  viewCount: number;
  replyCount: number;
  likeCount: number;
  lastPostTime: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    username: string;
    avatar: string | null;
  };
}

export interface ThreadDetail extends ThreadSummary {
  content: string;
  forum: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface PostItem {
  id: number;
  threadId: number;
  userId: number;
  content: string;
  floor: number;
  parentId: number | null;
  isThreadAuthor: boolean;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: number;
    username: string;
    avatar: string | null;
    level: number;
    postCount: number;
  };
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

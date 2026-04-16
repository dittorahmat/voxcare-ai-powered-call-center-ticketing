import type { KnowledgeArticle } from './types';

interface ArticleIndexEntry {
  id: string;
  title: string;
  category: string;
  tags: string[];
  published: boolean;
  helpfulCount: number;
  notHelpfulCount: number;
  updatedAt: string;
}

const INDEX_KEY = 'kb:index';
const ARTICLE_KEY_PREFIX = 'kb:articles:';

export async function storeArticle(kv: KVNamespace, article: KnowledgeArticle): Promise<void> {
  const key = `${ARTICLE_KEY_PREFIX}${article.id}`;
  await kv.put(key, JSON.stringify(article));
  await updateIndex(kv, article);
}

export async function getArticle(kv: KVNamespace, id: string): Promise<KnowledgeArticle | null> {
  const key = `${ARTICLE_KEY_PREFIX}${id}`;
  const data = await kv.get(key);
  if (!data) return null;
  return JSON.parse(data) as KnowledgeArticle;
}

export async function listArticles(
  kv: KVNamespace,
  options?: { category?: string; tag?: string; published?: boolean; search?: string }
): Promise<KnowledgeArticle[]> {
  const indexData = await kv.get(INDEX_KEY);
  const index: ArticleIndexEntry[] = indexData ? JSON.parse(indexData) : [];

  let filtered = index;
  if (options?.published !== undefined) {
    filtered = filtered.filter(a => a.published === options.published);
  }
  if (options?.category) {
    filtered = filtered.filter(a => a.category === options.category);
  }
  if (options?.tag) {
    filtered = filtered.filter(a => a.tags.includes(options.tag!));
  }

  // Full-text search: filter by title/content/tags match
  if (options?.search) {
    const query = options.search.toLowerCase();
    const terms = query.split(/\s+/).filter(Boolean);

    // First filter index by title/tags
    const matchedIndex = filtered.filter(a => {
      const titleLower = a.title.toLowerCase();
      return terms.some(t => titleLower.includes(t) || a.tags.some(tag => tag.toLowerCase().includes(t)));
    });

    // Then fetch full articles and search content
    const articles: KnowledgeArticle[] = [];
    for (const entry of matchedIndex) {
      const full = await getArticle(kv, entry.id);
      if (full) {
        const contentLower = full.content.toLowerCase();
        const titleLower = full.title.toLowerCase();
        const tagsMatch = full.tags.some(t => terms.some(term => t.toLowerCase().includes(term)));
        const contentMatch = terms.some(t => titleLower.includes(t) || contentLower.includes(t));
        if (contentMatch || tagsMatch) {
          articles.push(full);
        }
      }
    }

    // Simple relevance scoring
    articles.sort((a, b) => {
      const scoreA = terms.reduce((s, t) => {
        const inTitle = a.title.toLowerCase().includes(t) ? 10 : 0;
        const inContent = a.content.toLowerCase().includes(t) ? 1 : 0;
        const inTags = a.tags.some(tag => tag.toLowerCase().includes(t)) ? 5 : 0;
        return s + inTitle + inContent + inTags;
      }, 0);
      const scoreB = terms.reduce((s, t) => {
        const inTitle = b.title.toLowerCase().includes(t) ? 10 : 0;
        const inContent = b.content.toLowerCase().includes(t) ? 1 : 0;
        const inTags = b.tags.some(tag => tag.toLowerCase().includes(t)) ? 5 : 0;
        return s + inTitle + inContent + inTags;
      }, 0);
      return scoreB - scoreA;
    });

    return articles;
  }

  // No search: just fetch filtered articles
  const articles: KnowledgeArticle[] = [];
  for (const entry of filtered) {
    const full = await getArticle(kv, entry.id);
    if (full) articles.push(full);
  }
  return articles.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteArticle(kv: KVNamespace, id: string): Promise<boolean> {
  const key = `${ARTICLE_KEY_PREFIX}${id}`;
  const exists = await kv.get(key);
  if (!exists) return false;
  await kv.delete(key);
  await updateIndexAfterDelete(kv, id);
  return true;
}

export async function incrementArticleFeedback(
  kv: KVNamespace,
  id: string,
  helpful: boolean
): Promise<boolean> {
  const article = await getArticle(kv, id);
  if (!article) return false;

  if (helpful) {
    article.helpfulCount = (article.helpfulCount || 0) + 1;
  } else {
    article.notHelpfulCount = (article.notHelpfulCount || 0) + 1;
  }
  article.updatedAt = new Date().toISOString();

  await storeArticle(kv, article);
  return true;
}

export async function searchArticlesForTicket(
  kv: KVNamespace,
  ticketTitle: string,
  ticketDescription: string
): Promise<KnowledgeArticle[]> {
  const text = `${ticketTitle} ${ticketDescription}`.toLowerCase();
  const keywords = text.split(/\s+/).filter(w => w.length > 2);
  if (keywords.length === 0) return [];

  const allPublished = await listArticles(kv, { published: true });

  const scored = allPublished.map(article => {
    const titleLower = article.title.toLowerCase();
    const contentLower = article.content.toLowerCase();
    const tagsLower = article.tags.map(t => t.toLowerCase());

    let score = 0;
    for (const kw of keywords) {
      if (titleLower.includes(kw)) score += 10;
      if (tagsLower.some(t => t.includes(kw))) score += 5;
      if (contentLower.includes(kw)) score += 1;
    }

    return { article, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.article);
}

// ─── Internal helpers ──────────────────────────────────────

async function updateIndex(kv: KVNamespace, article: KnowledgeArticle): Promise<void> {
  const indexData = await kv.get(INDEX_KEY);
  const index: ArticleIndexEntry[] = indexData ? JSON.parse(indexData) : [];

  const existing = index.findIndex(a => a.id === article.id);
  const entry: ArticleIndexEntry = {
    id: article.id,
    title: article.title,
    category: article.category,
    tags: article.tags,
    published: article.published,
    helpfulCount: article.helpfulCount || 0,
    notHelpfulCount: article.notHelpfulCount || 0,
    updatedAt: article.updatedAt,
  };

  if (existing >= 0) {
    index[existing] = entry;
  } else {
    index.push(entry);
  }

  await kv.put(INDEX_KEY, JSON.stringify(index));
}

async function updateIndexAfterDelete(kv: KVNamespace, id: string): Promise<void> {
  const indexData = await kv.get(INDEX_KEY);
  if (!indexData) return;

  const index: ArticleIndexEntry[] = JSON.parse(indexData);
  const filtered = index.filter(a => a.id !== id);
  await kv.put(INDEX_KEY, JSON.stringify(filtered));
}

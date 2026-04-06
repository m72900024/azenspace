# azenspace v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade azenspace from empty blog shell to full-featured portfolio site with 6 category pages, dark/light mode, search, comments, about page, and mobile optimization.

**Architecture:** Pure HTML/CSS/JS with Firebase Firestore backend. No build tools. ESM imports via CDN. GitHub Pages hosting, Firebase for data.

**Tech Stack:** HTML5, CSS3 (custom properties for theming), vanilla JS (ES modules), Firebase Firestore/Auth v10 CDN, marked.js CDN, Google Fonts CDN.

---

## File Map

### New files
- `css/main.css` — full rewrite with dark/light theme variables, responsive design, frontend-design aesthetics
- `js/theme.js` — dark/light toggle + localStorage + system preference detection
- `js/category.js` — category page logic (fetch posts by category, pagination)
- `js/search.js` — client-side search across all published posts
- `js/comments.js` — comments CRUD (create for visitors, delete for admin)
- `js/about.js` — about page logic
- `category.html` — category listing page
- `search.html` — search results page
- `about.html` — about page

### Modified files
- `index.html` — redesign: hero + 6 category cards (replace flat post list)
- `post.html` — add comments section, add theme toggle in nav
- `admin.html` — add category dropdown, comments management section
- `js/db.js` — add fetchPostsByCategory(), fetchComments(), addComment(), deleteComment(), fetchAllPublishedPosts()
- `js/home.js` — rewrite: render 6 category cards with post counts (replace post list)
- `js/admin.js` — add category field, comments management
- `js/post.js` — integrate comments.js
- `firestore.rules` — add comments and categories rules
- `firestore.indexes.json` — add category+status+createdAt composite index

### Unchanged files
- `js/firebase-config.js` — no changes needed
- `js/auth.js` — no changes needed
- `admin-login.html` — no changes needed
- `css/admin.css` — minor additions only
- `firebase.json` / `.firebaserc` — no changes needed

---

## Task 1: Dark/Light Theme System

**Files:**
- Create: `js/theme.js`
- Modify: `css/main.css` (add `[data-theme="light"]` variables)
- Modify: `index.html` (add theme toggle button in nav, add theme.js script)

- [ ] **Step 1: Create js/theme.js**

```javascript
// js/theme.js
const STORAGE_KEY = 'azenspace-theme';

function getPreferred() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function apply(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

function toggle() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  apply(current === 'dark' ? 'light' : 'dark');
}

// Apply immediately (before DOM ready to prevent flash)
apply(getPreferred());

// Bind toggle button after DOM loads
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.addEventListener('click', toggle);
});
```

- [ ] **Step 2: Add light theme CSS variables to main.css**

Add after the existing `:root` block:

```css
[data-theme="light"] {
  --bg: #f5f5f5;
  --surface: #ffffff;
  --surface2: #eee;
  --border: #ddd;
  --accent: #6c5ce7;
  --accent-dim: rgba(108,92,231,0.1);
  --text: #1a1a1a;
  --muted: #666;
  --green: #16a34a;
}

[data-theme="light"] .nav {
  background: rgba(245,245,245,0.9);
}
```

- [ ] **Step 3: Add theme toggle button to nav in index.html**

Replace the nav section in `index.html`:

```html
<nav class="nav">
  <a href="index.html" class="nav-logo">azenspace</a>
  <div class="nav-links">
    <a href="index.html">首頁</a>
    <a href="about.html">關於</a>
    <button id="theme-toggle" class="theme-toggle" aria-label="切換主題">
      <span id="theme-icon">☀️</span>
    </button>
  </div>
</nav>
```

Add theme toggle CSS to main.css:

```css
.theme-toggle {
  background: none;
  border: 1px solid var(--border);
  border-radius: 99px;
  width: 36px;
  height: 36px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: border-color 0.2s;
}
.theme-toggle:hover { border-color: var(--accent); }
```

- [ ] **Step 4: Add theme.js to all HTML pages**

In every HTML page's `<head>`, add before other scripts:

```html
<script src="js/theme.js"></script>
```

This is a regular script (not module) so it runs immediately and prevents flash of wrong theme.

- [ ] **Step 5: Verify and commit**

Open index.html in browser. Click toggle. Verify:
- Colors switch between dark and light
- Refresh preserves the choice
- Nav background adapts

```bash
git add js/theme.js css/main.css index.html post.html admin.html admin-login.html
git commit -m "feat: add dark/light theme toggle with system preference detection"
```

---

## Task 2: Firestore Schema Updates (category, comments, rules)

**Files:**
- Modify: `js/db.js` — add category queries, comments CRUD, fetchAllPublishedPosts
- Modify: `firestore.rules` — add comments and categories rules
- Modify: `firestore.indexes.json` — add composite indexes

- [ ] **Step 1: Add new functions to js/db.js**

Append to existing `js/db.js`:

```javascript
export async function fetchPostsByCategory(category, lastDoc = null) {
  let constraints = [
    where('status', '==', 'published'),
    where('category', '==', category),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE)
  ];
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(collection(db, 'posts'), ...constraints));
  return {
    posts: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null
  };
}

export async function fetchCategoryCounts() {
  const snap = await getDocs(
    query(collection(db, 'posts'), where('status', '==', 'published'))
  );
  const counts = {};
  snap.docs.forEach(d => {
    const cat = d.data().category || 'uncategorized';
    counts[cat] = (counts[cat] || 0) + 1;
  });
  return counts;
}

export async function fetchAllPublishedPosts() {
  const snap = await getDocs(
    query(collection(db, 'posts'), where('status', '==', 'published'), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function fetchComments(postSlug) {
  const snap = await getDocs(
    query(collection(db, 'comments'), where('postSlug', '==', postSlug), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addComment(postSlug, nickname, content) {
  return addDoc(collection(db, 'comments'), {
    postSlug,
    nickname,
    content,
    createdAt: serverTimestamp()
  });
}

export async function deleteComment(commentId) {
  await deleteDoc(doc(db, 'comments', commentId));
}
```

Also update `savePost` to include category:

In the `savePost` function, add to the payload object:

```javascript
category: data.category || 'uncategorized',
```

- [ ] **Step 2: Update firestore.rules**

Replace `firestore.rules` with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read: if resource.data.status == "published";
      allow read, write: if request.auth != null
        && request.auth.token.email == "m72900024@gmail.com";
    }
    match /site-config/{doc} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.token.email == "m72900024@gmail.com";
    }
    match /comments/{commentId} {
      allow read: if true;
      allow create: if request.resource.data.nickname is string
        && request.resource.data.nickname.size() > 0
        && request.resource.data.nickname.size() <= 30
        && request.resource.data.content is string
        && request.resource.data.content.size() > 0
        && request.resource.data.content.size() <= 1000;
      allow delete: if request.auth != null
        && request.auth.token.email == "m72900024@gmail.com";
    }
    match /categories/{catId} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.token.email == "m72900024@gmail.com";
    }
  }
}
```

- [ ] **Step 3: Update firestore.indexes.json**

Replace with:

```json
{
  "indexes": [
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "comments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "postSlug", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

- [ ] **Step 4: Deploy rules and indexes**

```bash
cd /tmp/azenspace
firebase --project azenspace deploy --only firestore:rules,firestore:indexes
```

Expected: `✔ Deploy complete!`

- [ ] **Step 5: Commit**

```bash
git add js/db.js firestore.rules firestore.indexes.json
git commit -m "feat: add category queries, comments CRUD, updated Firestore rules"
```

---

## Task 3: Redesign Homepage with 6 Category Cards

**Files:**
- Modify: `index.html` — replace filter bar + post grid with 6 category cards
- Rewrite: `js/home.js` — render category cards with counts
- Modify: `css/main.css` — add category card styles

- [ ] **Step 1: Define categories data**

In `js/home.js`, define:

```javascript
import { fetchCategoryCounts, fetchSiteConfig } from './db.js';

const CATEGORIES = [
  { slug: '3d-print', name: '3D 列印', icon: '🖨️', desc: '3D 列印作品與教學' },
  { slug: 'pbs', name: '正向行為支持', icon: '💡', desc: 'PBS 相關內容' },
  { slug: 'ai-art', name: 'AI 繪圖', icon: '🎨', desc: 'AI 生成藝術作品' },
  { slug: 'teaching', name: '教學筆記', icon: '📝', desc: '課堂教材與筆記' },
  { slug: 'ai-tools', name: 'AI 運用', icon: '🤖', desc: 'AI 工具應用分享' },
  { slug: 'drone', name: '空拍機', icon: '✈️', desc: '空拍攝影與操作' },
];

function renderCategoryCard(cat, count) {
  return `
    <a href="category.html?cat=${cat.slug}" class="cat-card">
      <span class="cat-icon">${cat.icon}</span>
      <h2 class="cat-name">${cat.name}</h2>
      <p class="cat-desc">${cat.desc}</p>
      <span class="cat-count">${count || 0} 篇</span>
    </a>`;
}

async function init() {
  const counts = await fetchCategoryCounts();
  const grid = document.getElementById('cat-grid');
  grid.innerHTML = CATEGORIES.map(c => renderCategoryCard(c, counts[c.slug] || 0)).join('');

  const cfg = await fetchSiteConfig();
  if (cfg.heroTitle) document.getElementById('hero-title').textContent = cfg.heroTitle;
  if (cfg.bio) document.getElementById('hero-bio').textContent = cfg.bio;
}

init();
```

- [ ] **Step 2: Update index.html**

Replace the filter-bar, cards-grid, and load-more sections with:

```html
<div id="cat-grid" class="cat-grid"></div>
```

Remove the old filter buttons and load-more button.

- [ ] **Step 3: Add category card CSS to main.css**

```css
/* ── Category Grid ── */
.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  padding: 0 2rem 4rem;
  max-width: 1000px;
  margin: 0 auto;
}

.cat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2rem;
  text-decoration: none;
  color: var(--text);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.cat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 40px var(--accent-dim);
  border-color: rgba(124,111,247,0.3);
  text-decoration: none;
}
.cat-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
.cat-name { font-size: 1.2rem; font-weight: 600; }
.cat-desc { color: var(--muted); font-size: 0.9rem; flex: 1; }
.cat-count {
  font-size: 0.8rem;
  color: var(--accent);
  font-weight: 600;
  margin-top: 0.5rem;
}
```

- [ ] **Step 4: Verify and commit**

Open index.html. Should see 6 category cards with counts (all 0 for now). Click one → should navigate to category.html?cat=xxx.

```bash
git add index.html js/home.js css/main.css
git commit -m "feat: redesign homepage with 6 category cards"
```

---

## Task 4: Category Page

**Files:**
- Create: `category.html`
- Create: `js/category.js`

- [ ] **Step 1: Create category.html**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>azenspace</title>
  <link rel="stylesheet" href="css/main.css">
  <script src="js/theme.js"></script>
</head>
<body>
  <nav class="nav">
    <a href="index.html" class="nav-logo">azenspace</a>
    <div class="nav-links">
      <a href="index.html">首頁</a>
      <a href="about.html">關於</a>
      <button id="theme-toggle" class="theme-toggle" aria-label="切換主題">
        <span id="theme-icon">☀️</span>
      </button>
    </div>
  </nav>

  <div class="category-header">
    <a href="index.html" class="btn-back">← 返回首頁</a>
    <span id="cat-icon" class="cat-header-icon"></span>
    <h1 id="cat-title"></h1>
    <p id="cat-desc"></p>
  </div>

  <div id="cards-grid" class="cards-grid"></div>

  <div class="load-more-wrap">
    <button id="load-more" class="btn">載入更多</button>
  </div>

  <script type="module" src="js/category.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create js/category.js**

```javascript
import { fetchPostsByCategory } from './db.js';

const CATEGORIES = {
  '3d-print': { name: '3D 列印', icon: '🖨️', desc: '3D 列印作品與教學' },
  'pbs': { name: '正向行為支持', icon: '💡', desc: 'PBS 相關內容' },
  'ai-art': { name: 'AI 繪圖', icon: '🎨', desc: 'AI 生成藝術作品' },
  'teaching': { name: '教學筆記', icon: '📝', desc: '課堂教材與筆記' },
  'ai-tools': { name: 'AI 運用', icon: '🤖', desc: 'AI 工具應用分享' },
  'drone': { name: '空拍機', icon: '✈️', desc: '空拍攝影與操作' },
};

const params = new URLSearchParams(location.search);
const catSlug = params.get('cat');

if (!catSlug || !CATEGORIES[catSlug]) {
  location.href = 'index.html';
}

const cat = CATEGORIES[catSlug];
document.getElementById('cat-icon').textContent = cat.icon;
document.getElementById('cat-title').textContent = cat.name;
document.getElementById('cat-desc').textContent = cat.desc;
document.title = cat.name + ' — azenspace';

let lastDoc = null;
let loading = false;

function renderCard(post) {
  const date = post.createdAt?.toDate
    ? post.createdAt.toDate().toLocaleDateString('zh-TW') : '';
  const tags = (post.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
  const cover = post.coverImage
    ? `style="background-image:url('${post.coverImage}')"` : '';
  return `
    <article class="card" onclick="location.href='post.html?slug=${post.slug}'">
      <div class="card-cover" ${cover}>
        <span class="card-type ${post.type}">${post.type === 'work' ? '作品' : '文章'}</span>
      </div>
      <div class="card-body">
        <h2 class="card-title">${post.title}</h2>
        <p class="card-summary">${post.summary || ''}</p>
        <div class="card-footer">
          <div class="tags">${tags}</div>
          <time>${date}</time>
        </div>
      </div>
    </article>`;
}

async function loadMore() {
  if (loading) return;
  loading = true;
  document.getElementById('load-more').textContent = '載入中…';

  const { posts, lastDoc: newLast } = await fetchPostsByCategory(catSlug, lastDoc);
  lastDoc = newLast;

  const grid = document.getElementById('cards-grid');
  if (posts.length === 0 && !lastDoc) {
    grid.innerHTML = '<p class="empty">此分類尚無內容</p>';
  } else {
    posts.forEach(p => grid.insertAdjacentHTML('beforeend', renderCard(p)));
  }

  const btn = document.getElementById('load-more');
  if (!newLast || posts.length < 9) {
    btn.style.display = 'none';
  } else {
    btn.textContent = '載入更多';
  }
  loading = false;
}

document.getElementById('load-more').addEventListener('click', loadMore);
loadMore();
```

- [ ] **Step 3: Add category header CSS to main.css**

```css
/* ── Category Header ── */
.category-header {
  text-align: center;
  padding: 3rem 2rem 2rem;
  max-width: 640px;
  margin: 0 auto;
}
.category-header .btn-back {
  display: inline-block;
  margin-bottom: 1.5rem;
}
.cat-header-icon { font-size: 3rem; display: block; margin-bottom: 0.5rem; }
.category-header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.category-header p {
  color: var(--muted);
  font-size: 1rem;
}
```

- [ ] **Step 4: Commit**

```bash
git add category.html js/category.js css/main.css
git commit -m "feat: add category listing page"
```

---

## Task 5: Comments System

**Files:**
- Create: `js/comments.js`
- Modify: `post.html` — add comments section HTML
- Modify: `js/post.js` — import and init comments

- [ ] **Step 1: Create js/comments.js**

```javascript
import { fetchComments, addComment, deleteComment } from './db.js';
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const ADMIN_EMAIL = 'm72900024@gmail.com';
let isAdmin = false;
let currentSlug = null;
let lastSubmit = 0;

onAuthStateChanged(auth, (user) => {
  isAdmin = user?.email === ADMIN_EMAIL;
});

export async function initComments(postSlug) {
  currentSlug = postSlug;
  await renderComments();
  bindForm();
}

async function renderComments() {
  const comments = await fetchComments(currentSlug);
  const listEl = document.getElementById('comments-list');
  if (comments.length === 0) {
    listEl.innerHTML = '<p class="empty">還沒有留言，成為第一個留言的人吧！</p>';
    return;
  }
  listEl.innerHTML = comments.map(c => {
    const date = c.createdAt?.toDate
      ? c.createdAt.toDate().toLocaleDateString('zh-TW') : '';
    const deleteBtn = isAdmin
      ? `<button class="comment-delete" data-id="${c.id}">刪除</button>` : '';
    return `
      <div class="comment">
        <div class="comment-header">
          <strong class="comment-author">${escapeHtml(c.nickname)}</strong>
          <time>${date}</time>
          ${deleteBtn}
        </div>
        <p class="comment-body">${escapeHtml(c.content)}</p>
      </div>`;
  }).join('');

  listEl.querySelectorAll('.comment-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('刪除此留言？')) return;
      await deleteComment(btn.dataset.id);
      await renderComments();
    });
  });
}

function bindForm() {
  const form = document.getElementById('comment-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const now = Date.now();
    if (now - lastSubmit < 20000) {
      alert('請稍等再留言');
      return;
    }
    const nickname = form.querySelector('[name=nickname]').value.trim();
    const content = form.querySelector('[name=comment]').value.trim();
    if (!nickname || !content) return;

    const btn = form.querySelector('[type=submit]');
    btn.textContent = '送出中…';
    btn.disabled = true;

    await addComment(currentSlug, nickname, content);
    lastSubmit = Date.now();
    form.reset();
    btn.textContent = '送出留言';
    btn.disabled = false;
    await renderComments();
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
```

- [ ] **Step 2: Add comments HTML to post.html**

Add before `</body>` in post.html, before the script tag:

```html
<section class="comments-section">
  <h2 class="comments-title">留言</h2>
  <div id="comments-list"></div>
  <form id="comment-form" class="comment-form">
    <input name="nickname" placeholder="你的暱稱" maxlength="30" required>
    <textarea name="comment" placeholder="寫下你的留言…" maxlength="1000" rows="3" required></textarea>
    <button type="submit" class="btn btn-primary">送出留言</button>
  </form>
</section>
```

- [ ] **Step 3: Update js/post.js to init comments**

Add at the end of the `fetchPostBySlug` `.then()` callback:

```javascript
import { initComments } from './comments.js';
// ... inside the .then() after rendering post content:
initComments(slug);
```

- [ ] **Step 4: Add comments CSS to main.css**

```css
/* ── Comments ── */
.comments-section {
  max-width: 720px;
  margin: 0 auto 4rem;
  padding: 0 2rem;
  border-top: 1px solid var(--border);
  padding-top: 2rem;
}
.comments-title { font-size: 1.2rem; font-weight: 600; margin-bottom: 1.5rem; }
.comment {
  padding: 1rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 0.75rem;
}
.comment-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}
.comment-author { color: var(--text); }
.comment-header time { color: var(--muted); }
.comment-delete {
  margin-left: auto;
  background: none;
  border: none;
  color: #ef4444;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
}
.comment-body { font-size: 0.95rem; line-height: 1.6; }
.comment-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
.comment-form input,
.comment-form textarea {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  color: var(--text);
  font-family: var(--font);
  font-size: 0.95rem;
}
.comment-form input:focus,
.comment-form textarea:focus {
  outline: none;
  border-color: var(--accent);
}
.comment-form button { align-self: flex-end; }
```

- [ ] **Step 5: Commit**

```bash
git add js/comments.js js/post.js post.html css/main.css
git commit -m "feat: add visitor comment system with admin delete"
```

---

## Task 6: Search Page

**Files:**
- Create: `search.html`
- Create: `js/search.js`
- Modify: nav in all pages — add search icon/link

- [ ] **Step 1: Create search.html**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>搜尋 — azenspace</title>
  <link rel="stylesheet" href="css/main.css">
  <script src="js/theme.js"></script>
</head>
<body>
  <nav class="nav">
    <a href="index.html" class="nav-logo">azenspace</a>
    <div class="nav-links">
      <a href="index.html">首頁</a>
      <a href="about.html">關於</a>
      <button id="theme-toggle" class="theme-toggle" aria-label="切換主題">
        <span id="theme-icon">☀️</span>
      </button>
    </div>
  </nav>

  <div class="search-page">
    <div class="search-bar-wrap">
      <input id="search-input" type="text" placeholder="搜尋文章…" autofocus>
    </div>
    <p id="search-status" class="search-status"></p>
    <div id="search-results" class="cards-grid"></div>
  </div>

  <script type="module" src="js/search.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create js/search.js**

```javascript
import { fetchAllPublishedPosts } from './db.js';

let allPosts = [];

const input = document.getElementById('search-input');
const results = document.getElementById('search-results');
const status = document.getElementById('search-status');

// Preload all posts
status.textContent = '載入中…';
fetchAllPublishedPosts().then(posts => {
  allPosts = posts;
  status.textContent = `共 ${posts.length} 篇文章可供搜尋`;

  // Check URL params for initial query
  const q = new URLSearchParams(location.search).get('q');
  if (q) {
    input.value = q;
    search(q);
  }
});

input.addEventListener('input', () => {
  const q = input.value.trim();
  if (q.length < 1) {
    results.innerHTML = '';
    status.textContent = `共 ${allPosts.length} 篇文章可供搜尋`;
    return;
  }
  search(q);
});

function search(query) {
  const q = query.toLowerCase();
  const matched = allPosts.filter(p =>
    (p.title || '').toLowerCase().includes(q) ||
    (p.summary || '').toLowerCase().includes(q) ||
    (p.tags || []).some(t => t.toLowerCase().includes(q)) ||
    (p.category || '').toLowerCase().includes(q)
  );
  status.textContent = `找到 ${matched.length} 筆結果`;
  results.innerHTML = matched.map(renderCard).join('');
}

function renderCard(post) {
  const date = post.createdAt?.toDate
    ? post.createdAt.toDate().toLocaleDateString('zh-TW') : '';
  const tags = (post.tags || []).map(t => `<span class="tag">${t}</span>`).join('');
  const cover = post.coverImage
    ? `style="background-image:url('${post.coverImage}')"` : '';
  return `
    <article class="card" onclick="location.href='post.html?slug=${post.slug}'">
      <div class="card-cover" ${cover}>
        <span class="card-type ${post.type}">${post.type === 'work' ? '作品' : '文章'}</span>
      </div>
      <div class="card-body">
        <h2 class="card-title">${post.title}</h2>
        <p class="card-summary">${post.summary || ''}</p>
        <div class="card-footer">
          <div class="tags">${tags}</div>
          <time>${date}</time>
        </div>
      </div>
    </article>`;
}
```

- [ ] **Step 3: Add search link to nav and search page CSS**

Add to nav-links in all pages (between 關於 and theme toggle):

```html
<a href="search.html">搜尋</a>
```

Add CSS to main.css:

```css
/* ── Search ── */
.search-page { max-width: 1200px; margin: 0 auto; padding: 2rem; }
.search-bar-wrap { max-width: 500px; margin: 2rem auto; }
.search-bar-wrap input {
  width: 100%;
  padding: 0.8rem 1.2rem;
  border-radius: 99px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font-size: 1rem;
  font-family: var(--font);
}
.search-bar-wrap input:focus { outline: none; border-color: var(--accent); }
.search-status {
  text-align: center;
  color: var(--muted);
  font-size: 0.9rem;
  margin-bottom: 2rem;
}
```

- [ ] **Step 4: Commit**

```bash
git add search.html js/search.js css/main.css index.html post.html category.html
git commit -m "feat: add client-side search page"
```

---

## Task 7: About Page

**Files:**
- Create: `about.html`
- Create: `js/about.js`

- [ ] **Step 1: Create about.html**

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>關於 — azenspace</title>
  <link rel="stylesheet" href="css/main.css">
  <script src="js/theme.js"></script>
</head>
<body>
  <nav class="nav">
    <a href="index.html" class="nav-logo">azenspace</a>
    <div class="nav-links">
      <a href="index.html">首頁</a>
      <a href="search.html">搜尋</a>
      <a href="about.html">關於</a>
      <button id="theme-toggle" class="theme-toggle" aria-label="切換主題">
        <span id="theme-icon">☀️</span>
      </button>
    </div>
  </nav>

  <div class="about-page">
    <div class="about-hero">
      <div id="about-avatar" class="about-avatar"></div>
      <h1 id="about-name">Azen</h1>
      <p id="about-bio">大學老師 / 研究者 / 創作者</p>
    </div>

    <div class="about-content" id="about-content">
      <section class="about-section">
        <h2>關於我</h2>
        <p>熱衷於科技與教育的結合，探索 3D 列印、AI 繪圖、空拍機攝影等領域，並將這些技術應用於教學與研究中。</p>
      </section>

      <section class="about-section">
        <h2>專長領域</h2>
        <div class="skill-tags">
          <span class="skill-tag">3D 列印</span>
          <span class="skill-tag">正向行為支持</span>
          <span class="skill-tag">AI 繪圖</span>
          <span class="skill-tag">教學設計</span>
          <span class="skill-tag">AI 工具應用</span>
          <span class="skill-tag">空拍攝影</span>
        </div>
      </section>

      <section class="about-section">
        <h2>聯絡方式</h2>
        <div class="contact-links">
          <a id="contact-github" href="https://github.com/m72900024" target="_blank">GitHub</a>
          <a id="contact-email" href="mailto:m72900024@gmail.com">Email</a>
        </div>
      </section>
    </div>
  </div>

  <script type="module" src="js/about.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create js/about.js**

```javascript
import { fetchSiteConfig } from './db.js';

fetchSiteConfig().then(cfg => {
  if (cfg.ownerName) document.getElementById('about-name').textContent = cfg.ownerName;
  if (cfg.bio) document.getElementById('about-bio').textContent = cfg.bio;
  if (cfg.avatarUrl) {
    const el = document.getElementById('about-avatar');
    el.style.backgroundImage = `url('${cfg.avatarUrl}')`;
  }
  if (cfg.socialLinks?.github)
    document.getElementById('contact-github').href = cfg.socialLinks.github;
  if (cfg.socialLinks?.email)
    document.getElementById('contact-email').href = 'mailto:' + cfg.socialLinks.email;
});
```

- [ ] **Step 3: Add about page CSS to main.css**

```css
/* ── About ── */
.about-page { max-width: 720px; margin: 0 auto; padding: 3rem 2rem; }
.about-hero { text-align: center; margin-bottom: 3rem; }
.about-avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: var(--surface2);
  background-size: cover;
  background-position: center;
  margin: 0 auto 1.5rem;
  border: 3px solid var(--border);
}
.about-hero h1 { font-size: 2rem; font-weight: 700; margin-bottom: 0.5rem; }
.about-hero p { color: var(--muted); font-size: 1.1rem; }
.about-section { margin-bottom: 2.5rem; }
.about-section h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}
.about-section p { line-height: 1.8; }
.skill-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.skill-tag {
  padding: 0.4rem 1rem;
  border-radius: 99px;
  background: var(--accent-dim);
  color: var(--accent);
  font-size: 0.9rem;
  font-weight: 500;
}
.contact-links { display: flex; gap: 1rem; }
.contact-links a {
  padding: 0.5rem 1.2rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-size: 0.9rem;
  transition: all 0.2s;
}
.contact-links a:hover {
  border-color: var(--accent);
  color: var(--accent);
  text-decoration: none;
}
```

- [ ] **Step 4: Commit**

```bash
git add about.html js/about.js css/main.css
git commit -m "feat: add about page"
```

---

## Task 8: Admin Enhancements (category dropdown + comments management)

**Files:**
- Modify: `admin.html` — add category select, comments section
- Modify: `js/admin.js` — add category field, comments management

- [ ] **Step 1: Add category dropdown to admin.html form**

After the type/status form-row in admin.html, add:

```html
<div class="form-group">
  <label>分類</label>
  <select name="category">
    <option value="3d-print">3D 列印</option>
    <option value="pbs">正向行為支持</option>
    <option value="ai-art">AI 繪圖</option>
    <option value="teaching">教學筆記</option>
    <option value="ai-tools">AI 運用</option>
    <option value="drone">空拍機</option>
  </select>
</div>
```

- [ ] **Step 2: Add comments management section to admin.html**

After the form section, add:

```html
<section>
  <div class="section-header">
    <h2>留言管理</h2>
  </div>
  <ul id="comments-admin-list" class="post-list">
    <li class="loading">載入中…</li>
  </ul>
</section>
```

- [ ] **Step 3: Update js/admin.js**

Add category to fillForm:

```javascript
form.querySelector('[name=category]').value = post.category || '3d-print';
```

Add comments management:

```javascript
import { fetchAllPosts, savePost, deletePost, deleteComment } from './db.js';
import { collection, query, orderBy, getDocs, limit as fbLimit }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from './firebase-config.js';

async function loadComments() {
  const listEl = document.getElementById('comments-admin-list');
  const snap = await getDocs(
    query(collection(db, 'comments'), orderBy('createdAt', 'desc'))
  );
  const comments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (comments.length === 0) {
    listEl.innerHTML = '<li class="empty">沒有留言</li>';
    return;
  }
  listEl.innerHTML = comments.map(c => {
    const date = c.createdAt?.toDate
      ? c.createdAt.toDate().toLocaleDateString('zh-TW') : '';
    return `
      <li class="post-item">
        <div class="post-item-info">
          <strong>${c.nickname}</strong>
          <span style="color:var(--muted);font-size:0.85rem">${c.postSlug} · ${date}</span>
          <span style="font-size:0.9rem">${c.content.substring(0, 60)}${c.content.length > 60 ? '…' : ''}</span>
        </div>
        <div class="post-item-actions">
          <button class="btn-danger" onclick="confirmDeleteComment('${c.id}')">刪除</button>
        </div>
      </li>`;
  }).join('');
}

window.confirmDeleteComment = async (id) => {
  if (!confirm('刪除此留言？')) return;
  await deleteComment(id);
  await loadComments();
};

loadComments();
```

- [ ] **Step 4: Commit**

```bash
git add admin.html js/admin.js
git commit -m "feat: admin category dropdown and comments management"
```

---

## Task 9: Mobile Responsive & Hamburger Menu

**Files:**
- Modify: `css/main.css` — add media queries, hamburger menu styles
- Modify: all HTML pages — add hamburger button to nav

- [ ] **Step 1: Add hamburger button to nav HTML**

In each page's nav, add before nav-links:

```html
<button id="menu-toggle" class="menu-toggle" aria-label="選單">☰</button>
```

- [ ] **Step 2: Add responsive CSS and hamburger styles**

```css
/* ── Hamburger ── */
.menu-toggle {
  display: none;
  background: none;
  border: none;
  color: var(--text);
  font-size: 1.4rem;
  cursor: pointer;
}

@media (max-width: 640px) {
  .menu-toggle { display: block; }
  .nav-links {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--bg);
    border-bottom: 1px solid var(--border);
    flex-direction: column;
    padding: 1rem 2rem;
    gap: 1rem;
  }
  .nav-links.open { display: flex; }

  .hero { padding: 3rem 1.5rem 2rem; }
  .hero h1 { font-size: 1.8rem; }

  .cat-grid { grid-template-columns: 1fr 1fr; gap: 1rem; padding: 0 1rem 2rem; }
  .cards-grid { grid-template-columns: 1fr; gap: 1rem; padding: 0 1rem 1rem; }

  .post-header { padding: 0 1rem; }
  .post-body { padding: 0 1rem; }
  .comments-section { padding: 0 1rem; }

  .about-page { padding: 2rem 1rem; }

  .filter-bar { flex-wrap: wrap; }
}

@media (max-width: 400px) {
  .cat-grid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 3: Add hamburger toggle JS**

Add to `js/theme.js` (since it's loaded on all pages):

```javascript
document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.getElementById('menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (menuBtn && navLinks) {
    menuBtn.addEventListener('click', () => navLinks.classList.toggle('open'));
    // Close menu when clicking a link
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }
});
```

- [ ] **Step 4: Commit**

```bash
git add css/main.css js/theme.js index.html post.html category.html search.html about.html admin.html admin-login.html
git commit -m "feat: mobile responsive layout with hamburger menu"
```

---

## Task 10: Frontend Design Polish (using frontend-design skill)

**Files:**
- Modify: `css/main.css` — upgrade typography, colors, animations, textures
- Modify: all HTML pages — add Google Fonts link

- [ ] **Step 1: Apply frontend-design skill**

Invoke `frontend-design` skill to redesign the entire CSS with:
- Distinctive Google Fonts (not Inter/Roboto/Arial)
- Bold color palette for both dark and light modes
- Page load animations (staggered card reveals)
- Card hover micro-interactions
- Background texture/atmosphere
- Theme toggle transition animation

- [ ] **Step 2: Add Google Fonts to all HTML pages**

In each page's `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
```

Update CSS `--font`:

```css
--font: 'Outfit', 'Noto Sans TC', sans-serif;
```

(Final font choices will be determined by the frontend-design skill execution.)

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: frontend-design polish — typography, animations, atmosphere"
```

---

## Task 11: Deploy & Verify

- [ ] **Step 1: Deploy Firestore rules/indexes**

```bash
cd /tmp/azenspace
firebase --project azenspace deploy --only firestore:rules,firestore:indexes
```

- [ ] **Step 2: Push to GitHub**

```bash
git push
```

- [ ] **Step 3: End-to-end verification**

Open https://m72900024.github.io/azenspace/ and verify:
1. Homepage shows 6 category cards
2. Click category → shows filtered posts
3. Dark/light toggle works and persists
4. Search page finds posts by title/tags
5. About page renders correctly
6. Post page shows comments section
7. Mobile view: hamburger menu works, cards stack
8. Admin: category dropdown appears in form
9. Admin: comments management section works

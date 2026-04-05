import { fetchPostBySlug } from './db.js';

const params = new URLSearchParams(location.search);
const slug = params.get('slug');

if (!slug) {
  location.href = 'index.html';
}

fetchPostBySlug(slug).then(post => {
  if (!post) {
    document.getElementById('post-content').innerHTML = '<p>找不到此文章。</p>';
    return;
  }

  document.title = post.title + ' — azenspace';

  if (post.coverImage) {
    const cover = document.getElementById('post-cover');
    cover.style.backgroundImage = `url('${post.coverImage}')`;
    cover.style.display = 'block';
  }

  document.getElementById('post-type').textContent = post.type === 'work' ? '作品' : '文章';
  document.getElementById('post-type').className = 'post-type ' + post.type;
  document.getElementById('post-title').textContent = post.title;

  const date = post.createdAt?.toDate
    ? post.createdAt.toDate().toLocaleDateString('zh-TW') : '';
  document.getElementById('post-date').textContent = date;

  const tags = (post.tags || [])
    .map(t => `<span class="tag">${t}</span>`).join('');
  document.getElementById('post-tags').innerHTML = tags;

  document.getElementById('post-content').innerHTML =
    marked.parse(post.content || '');

  if (post.externalUrl) {
    const btn = document.getElementById('external-link');
    btn.href = post.externalUrl;
    btn.style.display = 'inline-flex';
  }
});

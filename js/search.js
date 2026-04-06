import { fetchAllPublishedPosts } from './db.js';

let allPosts = [];

const input = document.getElementById('search-input');
const results = document.getElementById('search-results');
const status = document.getElementById('search-status');

status.textContent = '載入中…';
fetchAllPublishedPosts().then(posts => {
  allPosts = posts;
  status.textContent = `共 ${posts.length} 篇文章可供搜尋`;

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

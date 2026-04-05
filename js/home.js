import { fetchPublishedPosts, fetchSiteConfig } from './db.js';

let lastDoc = null;
let currentType = 'all';
let loading = false;

function renderCard(post) {
  const date = post.createdAt?.toDate
    ? post.createdAt.toDate().toLocaleDateString('zh-TW')
    : '';
  const tags = (post.tags || [])
    .map(t => `<span class="tag">${t}</span>`).join('');
  const cover = post.coverImage
    ? `style="background-image:url('${post.coverImage}')"` : '';
  return `
    <article class="card" onclick="location.href='post.html?slug=${post.slug}'">
      <div class="card-cover" ${cover}>
        <span class="card-type ${post.type}">${post.type === 'work' ? '作品' : '文章'}</span>
        ${post.featured ? '<span class="card-featured">精選</span>' : ''}
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

  const { posts, lastDoc: newLast } = await fetchPublishedPosts(currentType, lastDoc);
  lastDoc = newLast;

  const grid = document.getElementById('cards-grid');
  if (posts.length === 0 && !lastDoc) {
    grid.innerHTML = '<p class="empty">目前沒有內容</p>';
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

function setType(type) {
  currentType = type;
  lastDoc = null;
  document.getElementById('cards-grid').innerHTML = '';
  document.getElementById('load-more').style.display = 'block';
  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.type === type);
  });
  loadMore();
}

// 初始化
document.querySelectorAll('.filter-btn').forEach(b => {
  b.addEventListener('click', () => setType(b.dataset.type));
});
document.getElementById('load-more').addEventListener('click', loadMore);

fetchSiteConfig().then(cfg => {
  if (cfg.heroTitle) document.getElementById('hero-title').textContent = cfg.heroTitle;
  if (cfg.bio) document.getElementById('hero-bio').textContent = cfg.bio;
  if (cfg.ownerName) document.title = cfg.ownerName + ' — azenspace';
  if (cfg.socialLinks?.github)
    document.getElementById('link-github').href = cfg.socialLinks.github;
});

loadMore();

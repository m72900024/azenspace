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

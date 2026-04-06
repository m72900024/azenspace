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

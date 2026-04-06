import { requireAdmin, logout } from './auth.js';
import { fetchAllPosts, savePost, deletePost, deleteComment } from './db.js';
import { db } from './firebase-config.js';
import { collection, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let editingId = null;

await requireAdmin();

document.getElementById('logout-btn').addEventListener('click', async () => {
  await logout();
  location.href = 'admin-login.html';
});

const form = document.getElementById('post-form');
const listEl = document.getElementById('post-list');

async function loadList() {
  listEl.innerHTML = '<li class="loading">載入中…</li>';
  const posts = await fetchAllPosts();
  if (posts.length === 0) {
    listEl.innerHTML = '<li class="empty">尚無文章</li>';
    return;
  }
  listEl.innerHTML = posts.map(p => `
    <li class="post-item ${p.status === 'draft' ? 'draft' : ''}">
      <div class="post-item-info">
        <span class="post-item-type ${p.type}">${p.type === 'work' ? '作品' : '文章'}</span>
        <strong>${p.title}</strong>
        <span class="post-item-status">${p.status === 'published' ? '已發布' : '草稿'}</span>
      </div>
      <div class="post-item-actions">
        <button onclick="editPost('${p.id}')">編輯</button>
        <button class="btn-danger" onclick="confirmDelete('${p.id}', '${p.title.replace(/'/g, "\\'")}')">刪除</button>
      </div>
    </li>
  `).join('');
}

window.editPost = async (id) => {
  const posts = await fetchAllPosts();
  const post = posts.find(p => p.id === id);
  if (!post) return;
  editingId = id;
  document.getElementById('form-title').textContent = '編輯文章';
  fillForm(post);
  document.getElementById('form-section').scrollIntoView({ behavior: 'smooth' });
};

window.confirmDelete = async (id, title) => {
  if (!confirm(`確定要刪除「${title}」？`)) return;
  await deletePost(id);
  await loadList();
};

function fillForm(post) {
  form.querySelector('[name=title]').value = post.title || '';
  form.querySelector('[name=slug]').value = post.slug || '';
  form.querySelector('[name=type]').value = post.type || 'blog';
  form.querySelector('[name=summary]').value = post.summary || '';
  form.querySelector('[name=content]').value = post.content || '';
  form.querySelector('[name=coverImage]').value = post.coverImage || '';
  form.querySelector('[name=tags]').value = (post.tags || []).join(', ');
  form.querySelector('[name=status]').value = post.status || 'draft';
  form.querySelector('[name=featured]').checked = !!post.featured;
  form.querySelector('[name=externalUrl]').value = post.externalUrl || '';
  form.querySelector('[name=category]').value = post.category || '3d-print';
}

function clearForm() {
  form.reset();
  editingId = null;
  document.getElementById('form-title').textContent = '新增文章';
}

document.getElementById('new-post-btn').addEventListener('click', () => {
  clearForm();
  document.getElementById('form-section').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('cancel-btn').addEventListener('click', clearForm);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  data.featured = form.querySelector('[name=featured]').checked;
  const btn = form.querySelector('[type=submit]');
  btn.textContent = '儲存中…';
  btn.disabled = true;
  await savePost(data, editingId);
  clearForm();
  await loadList();
  btn.textContent = '儲存';
  btn.disabled = false;
});

loadList();

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

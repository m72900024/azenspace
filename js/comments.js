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

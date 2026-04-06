import { db } from './firebase-config.js';
import {
  collection, query, where, orderBy, limit,
  startAfter, getDocs, getDoc, doc,
  addDoc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const PAGE_SIZE = 9;

export async function fetchPublishedPosts(type = null, lastDoc = null) {
  let constraints = [
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE)
  ];
  if (type && type !== 'all') {
    constraints.unshift(where('type', '==', type));
  }
  if (lastDoc) constraints.push(startAfter(lastDoc));

  const snap = await getDocs(query(collection(db, 'posts'), ...constraints));
  return {
    posts: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null
  };
}

export async function fetchPostBySlug(slug) {
  const snap = await getDocs(
    query(collection(db, 'posts'), where('slug', '==', slug), limit(1))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function fetchAllPosts() {
  const snap = await getDocs(
    query(collection(db, 'posts'), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function savePost(data, postId = null) {
  const payload = {
    title: data.title,
    slug: data.slug || slugify(data.title),
    type: data.type,
    category: data.category || 'uncategorized',
    summary: data.summary,
    content: data.content,
    coverImage: data.coverImage || '',
    tags: typeof data.tags === 'string'
      ? data.tags.split(',').map(t => t.trim()).filter(Boolean)
      : data.tags || [],
    status: data.status,
    featured: data.featured === true || data.featured === 'true',
    externalUrl: data.externalUrl || '',
    updatedAt: serverTimestamp()
  };
  if (postId) {
    await updateDoc(doc(db, 'posts', postId), payload);
    return postId;
  } else {
    payload.createdAt = serverTimestamp();
    const ref = await addDoc(collection(db, 'posts'), payload);
    return ref.id;
  }
}

export async function deletePost(postId) {
  await deleteDoc(doc(db, 'posts', postId));
}

export async function fetchSiteConfig() {
  const snap = await getDoc(doc(db, 'site-config', 'main'));
  return snap.exists() ? snap.data() : {};
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

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

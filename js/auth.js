import { auth } from './firebase-config.js';
import {
  GoogleAuthProvider, signInWithPopup,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const ADMIN_EMAIL = 'm72900024@gmail.com';

export function requireAdmin(redirectTo = 'admin-login.html') {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = redirectTo;
      } else {
        resolve(user);
      }
    });
  });
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

export const logout = () => signOut(auth);
export const ADMIN = ADMIN_EMAIL;

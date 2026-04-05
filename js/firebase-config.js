import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyA28_zX77G9rmKus-_ghh7GwKefhxdH0mg",
  authDomain: "azenspace.firebaseapp.com",
  projectId: "azenspace",
  storageBucket: "azenspace.firebasestorage.app",
  messagingSenderId: "21588346368",
  appId: "1:21588346368:web:7361a4517f456d41b9fae5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

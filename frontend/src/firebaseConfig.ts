// src/firebase/firebaseConfig.ts
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDVfk_NPm2ARoWkxMUGWP9r2GTEy_hESSQ",
  authDomain: "smart-maintanence.firebaseapp.com",
  projectId: "smart-maintanence",
  storageBucket: "smart-maintanence.appspot.com", // ✅ fixed here
  messagingSenderId: "770170970163",
  appId: "1:770170970163:web:b1332dc3d579f505eec346"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider };

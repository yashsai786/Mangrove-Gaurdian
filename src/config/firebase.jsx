
import { initializeApp } from "firebase/app";

import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: "AIzaSyCX2_8fAr9NaqOKWBhhjBnTZ2LZLgjnjgI",
  authDomain: "newproject-286fc.firebaseapp.com",
  projectId: "newproject-286fc",
  storageBucket: "newproject-286fc.firebasestorage.app",
  messagingSenderId: "91008632005",
  appId: "1:91008632005:web:79f447c305bf3ef40cdcac"
};


export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db = getFirestore(app);
export const storage = getStorage(app);
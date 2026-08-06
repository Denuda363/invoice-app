import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";

const firebaseConfig = {
  projectId: "zany-voice-8wh20",
  appId: "1:878008590731:web:b5016a326f558e1541cf8e",
  apiKey: "AIzaSyDyaLKoLKRe5BcENbrLP19qOoR0GEZflwk",
  authDomain: "zany-voice-8wh20.firebaseapp.com",
  storageBucket: "zany-voice-8wh20.firebasestorage.app",
  messagingSenderId: "878008590731",
  measurementId: "",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

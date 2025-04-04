import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfuB7wfMOXajWuAV1cS2xPsp-3Hx9Upk4",
  authDomain: "calccustas.firebaseapp.com",
  projectId: "calccustas",
  storageBucket: "calccustas.appspot.com",
  messagingSenderId: "912892414256",
  appId: "1:912892414256:web:b56f75b3a4441a1696e0f5",
  measurementId: "G-3Y1SZK94DT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, doc, setDoc, getDoc };
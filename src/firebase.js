// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
//import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCr2iT_bG53qS5Hi2XAcvOQpga02RU7aCA",
  authDomain: "cashiverse-93a27.firebaseapp.com",
  projectId: "cashiverse-93a27",
  storageBucket: "cashiverse-93a27.firebasestorage.app",
  messagingSenderId: "463944230802",
  appId: "1:463944230802:web:b80f73edbcf3413628c34b",
  measurementId: "G-SF48J4LP4Z"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);

export const db = getFirestore(app);

export const auth = getAuth(app);

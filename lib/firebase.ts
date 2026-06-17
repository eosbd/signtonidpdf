// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from " firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCwuiApRTa4IlEdcc6TBbIOvnEnWxRoNOs",
  authDomain: "e-online-service-bd.firebaseapp.com",
  projectId: "e-online-service-bd",
  storageBucket: "e-online-service-bd.firebasestorage.app",
  messagingSenderId: "693175949740",
  appId: "1:693175949740:web:8978012a6e7d0bcdddc209",
  measurementId: "G-G4GX5H68XF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);

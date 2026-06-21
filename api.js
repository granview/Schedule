import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCnXCsgQ2boqQ0vVLFfMscATesRzQiYkqY",
    authDomain: "schedule-da069.firebaseapp.com",
    databaseURL: "https://schedule-da069-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "schedule-da069",
    storageBucket: "schedule-da069.firebasestorage.app",
    messagingSenderId: "252748721990",
    appId: "1:252748721990:web:6e7e754f57bb7240d2bf47",
    measurementId: "G-YEYR42H8XB"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

const firebaseConfig = {
    apiKey: "AIzaSyDvd2b5abYGIk1aDDA2v8of72-Mf7mcTe4",
    authDomain: "acervogamer-6b320.firebaseapp.com",
    projectId: "acervogamer-6b320",
    storageBucket: "acervogamer-6b320.firebasestorage.app",
    messagingSenderId: "932802707137",
    appId: "1:932802707137:web:166e3bbba8f3d6f8885e40",
    measurementId: "G-2CRR1C6HYP"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

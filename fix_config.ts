import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getFirebaseConfig } from './firebase-config';

const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function fixConfig() {
  console.log("Creando documento public/config...");
  
  try {
    await setDoc(doc(db, 'public', 'config'), {
      isInitialized: true
    });
    console.log("Documento public/config creado exitosamente.");
  } catch (error) {
    console.error("Error al crear:", error);
  }
  process.exit(0);
}

fixConfig();

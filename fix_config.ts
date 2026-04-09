import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
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

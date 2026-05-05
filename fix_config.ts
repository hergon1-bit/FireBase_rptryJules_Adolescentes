import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig as config } from './utils/config';

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

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

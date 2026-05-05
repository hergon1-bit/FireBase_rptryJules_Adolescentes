import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from './utils/config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkConfig() {
  console.log("Verificando documento public/config...");
  
  try {
    const docRef = doc(db, 'public', 'config');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      console.log("Datos de public/config:", docSnap.data());
    } else {
      console.log("El documento public/config NO existe.");
    }
  } catch (error) {
    console.error("Error al verificar:", error);
  }
  process.exit(0);
}

checkConfig();

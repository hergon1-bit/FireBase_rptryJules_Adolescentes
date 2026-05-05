import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from './utils/config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function createUser() {
  const uid = 'f3TKN3RyW8QdOlVDkaPgXy5zYbw2';
  console.log("Creando documento para usuario:", uid);
  
  try {
    await setDoc(doc(db, 'usuarios', uid), {
      email: 'hergon1@gmail.com',
      nombre: 'Hermes Gonzalez',
      rolId: '1'
    });
    console.log("Documento creado exitosamente.");
  } catch (error) {
    console.error("Error al crear:", error);
  }
  process.exit(0);
}

createUser();

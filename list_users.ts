import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { firebaseConfig as config } from './utils/config';

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function listUsers() {
  console.log("Listando documentos en la colección 'usuarios'...");
  
  try {
    const querySnapshot = await getDocs(collection(db, 'usuarios'));
    
    if (querySnapshot.empty) {
      console.log("La colección 'usuarios' está vacía.");
    } else {
      querySnapshot.forEach((doc) => {
        console.log("ID del documento:", doc.id);
        console.log("Datos:", doc.data());
      });
    }
  } catch (error) {
    console.error("Error al listar:", error);
  }
  process.exit(0);
}

listUsers();

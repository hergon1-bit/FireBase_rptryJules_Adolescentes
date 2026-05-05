import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig as config } from './utils/config';

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function debugLogin() {
  const uid = 'f3TKN3RyW8QdOlVDkaPgXy5zYbw2';
  console.log("Debugueando login para usuario:", uid);
  
  try {
    const userSnap = await getDoc(doc(db, 'usuarios', uid));
    if (!userSnap.exists()) {
      console.log("ERROR: Usuario no encontrado en Firestore.");
      process.exit(0);
    }
    
    const userData = userSnap.data();
    console.log("Datos del usuario:", userData);
    
    const rolId = userData.rolId;
    console.log("Buscando rol con ID:", rolId);
    
    const rolSnap = await getDoc(doc(db, 'roles', String(rolId)));
    if (!rolSnap.exists()) {
      console.log("ERROR: Rol no encontrado en Firestore.");
    } else {
      console.log("Datos del rol:", rolSnap.data());
      console.log("Login exitoso (simulado).");
    }
  } catch (error) {
    console.error("Error en debug:", error);
  }
  process.exit(0);
}

debugLogin();

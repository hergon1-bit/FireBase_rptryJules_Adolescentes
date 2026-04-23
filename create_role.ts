import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import { createFullPermissions } from './utils/helpers';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function createDefaultRole() {
  console.log("Creando rol por defecto...");
  
  try {
    await setDoc(doc(db, 'roles', '1'), {
      nombre: 'Administrador',
      permisos: createFullPermissions({ read: true, create: true, update: true, delete: true })
    });
    console.log("Rol creado exitosamente.");
  } catch (error) {
    console.error("Error al crear rol:", error);
  }
  process.exit(0);
}

createDefaultRole();

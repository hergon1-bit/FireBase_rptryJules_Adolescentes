import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig as config } from './utils/config';

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function createDefaultRole() {
  console.log("Creando rol por defecto...");
  
  try {
    await setDoc(doc(db, 'roles', '1'), {
      nombre: 'Administrador',
      permisos: {
        adolescentes: { read: true, create: true, update: true, delete: true },
        asistencias: { read: true, create: true, update: true, delete: true },
        celebraciones_cumpleanos: { read: true, create: true, update: true, delete: true },
        devocionales: { read: true, create: true, update: true, delete: true },
        encargados: { read: true, create: true, update: true, delete: true },
        entregas_devocionales: { read: true, create: true, update: true, delete: true },
        eventos: { read: true, create: true, update: true, delete: true },
        inscripciones_eventos: { read: true, create: true, update: true, delete: true },
        inscripciones_servidores: { read: true, create: true, update: true, delete: true },
        pagos_eventos: { read: true, create: true, update: true, delete: true },
        pagos_servidores: { read: true, create: true, update: true, delete: true },
        participantes_eventos: { read: true, create: true, update: true, delete: true },
        reuniones: { read: true, create: true, update: true, delete: true },
        roles: { read: true, create: true, update: true, delete: true },
        servidores: { read: true, create: true, update: true, delete: true },
        tutor_adolescente: { read: true, create: true, update: true, delete: true },
        tutores: { read: true, create: true, update: true, delete: true },
        usuarios: { read: true, create: true, update: true, delete: true },
      }
    });
    console.log("Rol creado exitosamente.");
  } catch (error) {
    console.error("Error al crear rol:", error);
  }
  process.exit(0);
}

createDefaultRole();

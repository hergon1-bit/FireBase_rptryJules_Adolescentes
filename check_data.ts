import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit } from 'firebase/firestore';
import { getFirebaseConfig } from './firebase-config';

const config = getFirebaseConfig();
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
  const asisSnap = await getDocs(collection(db, 'asistencias'));
  console.log("Asistencias count:", asisSnap.size);
  if (asisSnap.size > 0) {
    console.log("Sample asistencia:", asisSnap.docs[0].data());
  }

  const reuSnap = await getDocs(collection(db, 'reuniones'));
  console.log("Reuniones count:", reuSnap.size);
  if (reuSnap.size > 0) {
    console.log("Sample reunion:", reuSnap.docs[0].data());
  }
}

check().catch(console.error);

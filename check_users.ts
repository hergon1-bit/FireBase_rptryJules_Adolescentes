import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getFirebaseConfig } from './firebase-config';

const config = getFirebaseConfig();
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
  const usersSnap = await getDocs(collection(db, 'usuarios'));
  console.log("Usuarios count:", usersSnap.size);
  if (usersSnap.size > 0) {
    console.log("Sample usuario:", usersSnap.docs[0].id, usersSnap.docs[0].data());
  }
}

check().catch(console.error);

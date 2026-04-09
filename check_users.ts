import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
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

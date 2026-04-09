import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
  const usersSnap = await getDocs(collection(db, 'usuarios'));
  console.log("All usuarios in Firestore:");
  usersSnap.forEach(doc => {
      console.log(doc.id, doc.data().email, doc.data().nombre);
  });
}

check().catch(console.error);

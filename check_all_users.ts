import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { firebaseConfig as config } from './utils/config';

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

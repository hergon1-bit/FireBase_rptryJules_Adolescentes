import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getFirebaseConfig } from './firebase-config';

const config = getFirebaseConfig();
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
  const usersSnap = await getDocs(collection(db, 'usuarios'));
  console.log("Usuarios count:", usersSnap.size);
  if (usersSnap.size > 0) {
    const user = usersSnap.docs[0].data();
    console.log("Sample usuario:", usersSnap.docs[0].id, user);
    
    if (user.rolId) {
        const rolSnap = await getDoc(doc(db, 'roles', String(user.rolId)));
        console.log("Rol exists?", rolSnap.exists());
        if (rolSnap.exists()) {
            console.log("Rol data:", rolSnap.data());
        }
    }
  }
}

check().catch(console.error);

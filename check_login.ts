import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';
import { firebaseConfig as config } from './utils/config';

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
  const email = 'hergon1@gmail.com'; // User's email
  console.log("Checking for email:", email);
  
  const q = query(collection(db, 'usuarios'), where('email', '==', email));
  const snapshot = await getDocs(q);
  console.log("Found by email:", snapshot.size);
  if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      console.log("User data:", docSnap.id, docSnap.data());
      
      const rolId = docSnap.data().rolId;
      console.log("Checking rolId:", rolId);
      
      const rolSnap = await getDoc(doc(db, 'roles', String(rolId)));
      console.log("Rol exists?", rolSnap.exists());
      if (rolSnap.exists()) {
          console.log("Rol data:", rolSnap.data());
      }
  }
}

check().catch(console.error);

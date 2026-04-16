import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getFirebaseConfig } from './firebase-config';

const config = getFirebaseConfig();
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
    try {
        const snapR = await getDocs(collection(db, 'reuniones'));
        const reuniones = snapR.docs.map(d => ({id: d.id, tema: d.data().tema}));
        console.log("Reunion 13:", reuniones.find(r => r.id === '13'));
        console.log("Reunion 10:", reuniones.find(r => r.id === '10'));
    } catch (e) {
        console.error(e);
    }
}

check();

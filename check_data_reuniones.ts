import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import { getFirebaseConfig } from './firebase-config';

const config = getFirebaseConfig();
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function checkData() {
    try {
        const rSnap = await getDocs(collection(db, 'reuniones'));
        console.log("Reuniones count:", rSnap.size);
        rSnap.docs.slice(0, 3).forEach(doc => {
            console.log(`Reunion Doc ID: ${doc.id}`, doc.data());
        });

        const aSnap = await getDocs(collection(db, 'asistencias'));
        console.log("Asistencias count:", aSnap.size);
        aSnap.docs.slice(0, 3).forEach(doc => {
            console.log(`Asistencia Doc ID: ${doc.id}`, doc.data());
        });
        
    } catch (e) {
        console.error("Error:", e);
    }
}

checkData().catch(console.error);

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import { getFirebaseConfig } from './firebase-config';

const config = getFirebaseConfig();
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function checkAsistencias() {
    try {
        const q = query(collection(db, 'asistencias'), limit(5));
        const snapshot = await getDocs(q);
        
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            console.log(`Doc ID: ${doc.id}`);
            console.log(`reunionId: ${data.reunionId} (type: ${typeof data.reunionId})`);
            console.log(`adolescenteId: ${data.adolescenteId} (type: ${typeof data.adolescenteId})`);
            console.log(`estado: ${data.estado}`);
            console.log('---');
        });
        
    } catch (e) {
        console.error("Error:", e);
    }
}

checkAsistencias().catch(console.error);

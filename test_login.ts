import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { firebaseConfig as config } from './utils/config';

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function testLoadProfile(email: string) {
    console.log(`Testing load profile for email: ${email}`);
    
    try {
        const q = query(collection(db, 'usuarios'), where('email', '==', email));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            console.log("No user found with that email.");
            return;
        }
        
        const docSnap = snapshot.docs[0];
        const profile = { id: docSnap.id, ...docSnap.data() };
        console.log("Found profile:", profile);
        
        if (profile.rolId) {
            const rolSnap = await getDoc(doc(db, 'roles', String(profile.rolId)));
            if (rolSnap.exists()) {
                console.log("Found role:", rolSnap.data());
            } else {
                console.log(`Role with ID ${profile.rolId} not found!`);
            }
        } else {
            console.log("Profile has no rolId!");
        }
        
    } catch (e) {
        console.error("Error:", e);
    }
}

testLoadProfile('hergon1@gmail.com').catch(console.error);

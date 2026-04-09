import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

function toCamelCase(str: string) {
  return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
}

async function fixTable(tableName: string) {
  const snapshot = await getDocs(collection(db, tableName));
  let count = 0;
  
  const chunks = [];
  for (let i = 0; i < snapshot.docs.length; i += 400) {
      chunks.push(snapshot.docs.slice(i, i + 400));
  }

  for (const chunk of chunks) {
      const batch = writeBatch(db);
      for (const document of chunk) {
          const data = document.data();
          const newData: any = {};
          let changed = false;
          for (const key in data) {
              const camelKey = toCamelCase(key);
              newData[camelKey] = data[key];
              if (camelKey !== key) {
                  changed = true;
              }
          }
          if (changed) {
              // we need to remove old keys and set new ones.
              // the easiest way is to set the whole document.
              batch.set(document.ref, newData);
              count++;
          }
      }
      await batch.commit();
  }
  console.log(`Fixed ${count} documents in ${tableName}`);
}

async function run() {
  const tables = [
      'roles', 'usuarios', 'adolescentes', 'servidores', 'encargados', 
      'tutores', 'tutor_adolescente', 'reuniones', 'asistencias', 
      'eventos', 'inscripciones_eventos', 'pagos_eventos', 
      'participantes_eventos', 'inscripciones_servidores', 
      'pagos_servidores', 'celebraciones_cumpleanos', 
      'devocionales', 'entregas_devocionales'
  ];
  for (const table of tables) {
      await fixTable(table);
  }
}

run().catch(console.error);

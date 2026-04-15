
import { createClient } from '@supabase/supabase-js';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, writeBatch, getDocs, deleteDoc } from 'firebase/firestore';
import fs from 'fs';

// This script migrates data from Supabase to Firebase Firestore securely.
// Run this locally using: npx tsx migrate_supabase.ts

async function migrate() {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('Error: Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
        process.exit(1);
    }

    // Load Firebase config
    let firebaseConfig;
    try {
        firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
    } catch (error) {
        console.error('Error: Could not find or read firebase-applet-config.json');
        process.exit(1);
    }

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const tables = [
        'roles',
        'usuarios',
        'adolescentes',
        'servidores',
        'encargados',
        'tutores',
        'tutor_adolescente',
        'reuniones',
        'asistencias',
        'eventos',
        'inscripciones_eventos',
        'pagos_eventos',
        'participantes_eventos',
        'inscripciones_servidores',
        'pagos_servidores',
        'celebraciones_cumpleanos',
        'devocionales',
        'entregas_devocionales'
    ];

    console.log('Starting migration...');

    for (const table of tables) {
        console.log(`Processing table: ${table}...`);

        let allData: any[] = [];
        let from = 0;
        const step = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase.from(table).select('*').range(from, from + step - 1);
            if (error) {
                console.error(`Error fetching from Supabase table ${table}:`, error.message);
                hasMore = false;
                continue;
            }
            if (data && data.length > 0) {
                allData = [...allData, ...data];
                from += step;
                if (data.length < step) {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }
        }

        if (allData.length === 0) {
            console.log(`Table ${table} is empty. Skipping...`);
            continue;
        }

        console.log(`Migrating ${allData.length} records from ${table} to Firebase...`);

        // Clear existing data in Firebase for this table
        const snapshot = await getDocs(collection(db, table));
        const deleteChunks = [];
        for (let i = 0; i < snapshot.docs.length; i += 400) {
            deleteChunks.push(snapshot.docs.slice(i, i + 400));
        }
        for (const chunk of deleteChunks) {
            const batch = writeBatch(db);
            chunk.forEach(docSnapshot => batch.delete(docSnapshot.ref));
            await batch.commit();
        }

        // Insert new data
        const chunks = [];
        for (let i = 0; i < allData.length; i += 400) {
            chunks.push(allData.slice(i, i + 400));
        }

        for (const chunk of chunks) {
            const batch = writeBatch(db);
            for (const item of chunk) {
                const docId = item.id ? String(item.id) : undefined;
                const docRef = docId ? doc(db, table, docId) : doc(collection(db, table));

                // Convert keys from snake_case to camelCase
                const cleanItem: any = {};
                Object.keys(item).forEach(key => {
                    if (item[key] !== undefined) {
                        const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
                        cleanItem[camelKey] = item[key];
                    }
                });

                batch.set(docRef, cleanItem);
            }
            await batch.commit();
        }

        console.log(`Successfully migrated ${table}.`);
    }

    console.log('Migration completed successfully!');
}

migrate().catch(err => {
    console.error('Critical error during migration:', err);
    process.exit(1);
});

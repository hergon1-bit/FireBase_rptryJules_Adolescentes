import fs from 'fs';

async function run() {
  const url = process.env.VITE_SUPABASE_URL + '/rest/v1/?apikey=' + process.env.VITE_SUPABASE_ANON_KEY;
  try {
    const res = await fetch(url);
    const data = await res.json();
    fs.writeFileSync('schema.json', JSON.stringify(data, null, 2));
    console.log('Schema saved to schema.json');
  } catch (e) {
    console.error(e);
  }
}
run();

const fs = require('fs');
const path = './pages/ReportesFinancieros.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/eventos\.find\(e => e\.id === selectedEventoId\)/g, 'eventos.find(e => String(e.id) === String(selectedEventoId))');
fs.writeFileSync(path, content);
console.log('Done');

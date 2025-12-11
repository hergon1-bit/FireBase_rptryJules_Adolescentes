
export const calcularEdad = (fechaNacimiento: string): number => {
  if (!fechaNacimiento) return 0;
  
  let year: number = 0;
  let month: number = 0;
  let day: number = 0;

  // Limpiar espacios
  const cleanDate = fechaNacimiento.trim();

  // Caso 1: Formato ISO estándar o DB (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss)
  if (cleanDate.includes('-')) {
      // Tomar solo la parte de la fecha si hay hora (T)
      const datePart = cleanDate.split('T')[0]; 
      const parts = datePart.split('-');
      
      if (parts.length === 3) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1; // 0-indexed
          day = parseInt(parts[2], 10);
      }
  } 
  // Caso 2: Formato con barras (DD/MM/YYYY o YYYY/MM/DD)
  else if (cleanDate.includes('/')) {
      const parts = cleanDate.split('/');
      if (parts.length === 3) {
          // Detectar si el año es el primero o el último
          if (parts[0].length === 4) {
              // YYYY/MM/DD
              year = parseInt(parts[0], 10);
              month = parseInt(parts[1], 10) - 1;
              day = parseInt(parts[2], 10);
          } else {
              // DD/MM/YYYY (Asumimos formato latino/europeo si empieza con 2 digitos)
              day = parseInt(parts[0], 10);
              month = parseInt(parts[1], 10) - 1;
              year = parseInt(parts[2], 10);
          }
      }
  }

  // Validación básica de los componentes
  if (year > 1900 && year < new Date().getFullYear() + 1 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const hoy = new Date();
      let edad = hoy.getFullYear() - year;
      const m = hoy.getMonth() - month;
      if (m < 0 || (m === 0 && hoy.getDate() < day)) {
          edad--;
      }
      return edad >= 0 ? edad : 0;
  }
  
  // Fallback final: Intentar parseo nativo de JS (menos confiable para formatos latinos)
  const cumpleanos = new Date(fechaNacimiento);
  if (isNaN(cumpleanos.getTime())) {
    return 0; 
  }

  const hoy = new Date();
  let edad = hoy.getFullYear() - cumpleanos.getFullYear();
  const m = hoy.getMonth() - cumpleanos.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumpleanos.getDate())) {
    edad--;
  }
  return edad >= 0 ? edad : 0;
};

export const calcularProximoCumpleanos = (fechaNacimiento: string): Date => {
  if (!fechaNacimiento) return new Date();
  
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0); // Normalizar hoy
  
  let cumpleMonth: number, cumpleDay: number;

  const cleanDate = fechaNacimiento.trim().split('T')[0];

  if (cleanDate.includes('-')) {
      const parts = cleanDate.split('-');
      cumpleMonth = parseInt(parts[1], 10) - 1;
      cumpleDay = parseInt(parts[2], 10);
  } else if (cleanDate.includes('/')) {
      const parts = cleanDate.split('/');
      if (parts[0].length === 4) { // YYYY/MM/DD
          cumpleMonth = parseInt(parts[1], 10) - 1;
          cumpleDay = parseInt(parts[2], 10);
      } else { // DD/MM/YYYY
           cumpleMonth = parseInt(parts[1], 10) - 1;
           cumpleDay = parseInt(parts[0], 10);
      }
  } else {
      const cumple = new Date(fechaNacimiento);
      if (isNaN(cumple.getTime())) return new Date();
      cumpleMonth = cumple.getMonth();
      cumpleDay = cumple.getDate();
  }

  const currentYear = hoy.getFullYear();
  let proximoCumple = new Date(currentYear, cumpleMonth, cumpleDay);
  
  if (proximoCumple < hoy) {
    proximoCumple.setFullYear(currentYear + 1);
  }
  return proximoCumple;
};

export const formatDate = (date: Date | string) => {
  if (!date) return 'N/A';
  
  // Normalizar string
  const dateStr = typeof date === 'string' ? date.split('T')[0] : '';
  
  // Si es string YYYY-MM-DD
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      return d.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
  }

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Fecha inválida';
  
  const userTimezoneOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() + userTimezoneOffset).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(amount);
};

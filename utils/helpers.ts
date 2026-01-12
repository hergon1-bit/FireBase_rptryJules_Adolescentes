
export const calcularEdad = (fechaNacimiento: string): number => {
  if (!fechaNacimiento) return 0;
  
  let year: number = 0;
  let month: number = 0;
  let day: number = 0;

  const cleanDate = fechaNacimiento.trim();

  if (cleanDate.includes('-')) {
      const datePart = cleanDate.split('T')[0]; 
      const parts = datePart.split('-');
      if (parts.length === 3) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          day = parseInt(parts[2], 10);
      }
  } 
  else if (cleanDate.includes('/')) {
      const parts = cleanDate.split('/');
      if (parts.length === 3) {
          if (parts[0].length === 4) {
              year = parseInt(parts[0], 10);
              month = parseInt(parts[1], 10) - 1;
              day = parseInt(parts[2], 10);
          } else {
              day = parseInt(parts[0], 10);
              month = parseInt(parts[1], 10) - 1;
              year = parseInt(parts[2], 10);
          }
      }
  }

  if (year > 1900 && year < new Date().getFullYear() + 1 && month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const hoy = new Date();
      let edad = hoy.getFullYear() - year;
      const m = hoy.getMonth() - month;
      if (m < 0 || (m === 0 && hoy.getDate() < day)) {
          edad--;
      }
      return edad >= 0 ? edad : 0;
  }
  
  const cumpleanos = new Date(fechaNacimiento);
  if (isNaN(cumpleanos.getTime())) return 0;

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
  hoy.setHours(0, 0, 0, 0);
  
  let cumpleMonth: number, cumpleDay: number;
  const cleanDate = fechaNacimiento.trim().split('T')[0];

  if (cleanDate.includes('-')) {
      const parts = cleanDate.split('-');
      cumpleMonth = parseInt(parts[1], 10) - 1;
      cumpleDay = parseInt(parts[2], 10);
  } else if (cleanDate.includes('/')) {
      const parts = cleanDate.split('/');
      if (parts[0].length === 4) {
          cumpleMonth = parseInt(parts[1], 10) - 1;
          cumpleDay = parseInt(parts[2], 10);
      } else {
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
  if (proximoCumple < hoy) proximoCumple.setFullYear(currentYear + 1);
  return proximoCumple;
};

export const formatDate = (date: Date | string) => {
  if (!date) return 'N/A';
  
  const dateStr = typeof date === 'string' ? date.split('T')[0] : '';
  
  if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  }

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Fecha inválida';
  
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatDateShort = (date: Date | string) => formatDate(date);

export const formatRelativeTime = (date: Date | string) => {
    if (!date) return 'Nunca';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return 'N/A';
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
    if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    return formatDate(d);
};

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 }).format(amount);
};

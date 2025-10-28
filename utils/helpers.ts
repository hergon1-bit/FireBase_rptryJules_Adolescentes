
export const calcularEdad = (fechaNacimiento: string): number => {
  const hoy = new Date();
  const cumpleanos = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - cumpleanos.getFullYear();
  const m = hoy.getMonth() - cumpleanos.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumpleanos.getDate())) {
    edad--;
  }
  return edad;
};

export const calcularProximoCumpleanos = (fechaNacimiento: string): Date => {
  const hoy = new Date();
  const cumple = new Date(fechaNacimiento);
  const proximoCumple = new Date(hoy.getFullYear(), cumple.getMonth(), cumple.getDate() + 1);
  if (proximoCumple < hoy) {
    proximoCumple.setFullYear(hoy.getFullYear() + 1);
  }
  return proximoCumple;
};

export const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Adjust for timezone offset
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

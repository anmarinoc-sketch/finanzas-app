/**
 * El borrador del onboarding. Cubre el fallo reportado: al pulsar una
 * plantilla reaparecían los bolsillos que el usuario había borrado, porque
 * la plantilla reconstruía la lista desde cero en vez de aplicarse sobre la
 * lista actual.
 */
import { useOnboarding } from '../src/store/onboarding';

const suma = () => useOnboarding.getState().bolsillos.reduce((a, b) => a + b.porcentaje, 0);
const nombres = () => useOnboarding.getState().bolsillos.map((b) => b.nombre);

beforeEach(() => { useOnboarding.getState().reiniciar(); });

describe('distribución por bolsillos', () => {
  test('arranca con los cinco por defecto sumando 100%', () => {
    expect(nombres()).toHaveLength(5);
    expect(suma()).toBe(100);
  });

  test('una plantilla NO resucita un bolsillo borrado', () => {
    const { setBolsillos, aplicarPlantilla } = useOnboarding.getState();
    setBolsillos(useOnboarding.getState().bolsillos.filter((b) => b.tipo !== 'deudas'));
    expect(nombres()).not.toContain('Deudas');

    aplicarPlantilla('50/30/20');
    expect(nombres()).not.toContain('Deudas');
    expect(nombres()).toHaveLength(4);
    expect(suma()).toBe(100);
  });

  test('una plantilla conserva los bolsillos personalizados', () => {
    const { setBolsillos, aplicarPlantilla } = useOnboarding.getState();
    setBolsillos([...useOnboarding.getState().bolsillos, {
      nombre: 'Viajes', tipo: 'personalizado', porcentaje: 0, color: '#14B8A6', icono: 'airplane-outline',
    }]);
    aplicarPlantilla('60/20/20');
    expect(nombres()).toContain('Viajes');
    expect(suma()).toBe(100);
  });

  test('las plantillas dejan el total exactamente en 100', () => {
    const { aplicarPlantilla } = useOnboarding.getState();
    aplicarPlantilla('50/30/20');
    expect(suma()).toBe(100);
    aplicarPlantilla('60/20/20');
    expect(suma()).toBe(100);
  });

  test('precargar deja el borrador con lo que ya estaba guardado', () => {
    useOnboarding.getState().precargarDesdeBD({
      ingresos: [{ nombre: 'Salario', monto: 4_000_000, frecuencia: 'mensual' }],
      bolsillos: [{ nombre: 'Todo', tipo: 'necesidades', porcentaje: 100, color: '#3B82F6', icono: 'home-outline' }],
      categoriasDesactivadas: [7],
      diaInicioCiclo: 15, tema: 'oscuro', biometria: true, notificaciones: false, nombre: 'Andrés',
    });
    const e = useOnboarding.getState();
    expect(e.ingresos).toHaveLength(1);
    expect(e.diaInicioCiclo).toBe(15);
    expect(e.nombre).toBe('Andrés');
    expect(e.categoriasDesactivadas).toEqual([7]);
  });
});

/**
 * Edición del monto con cursor.
 *
 * El monto se ve formateado ("1.250.000") pero por dentro son dígitos
 * ("1250000"). Para poder tocar el número y corregir UN dígito hay que
 * traducir entre la posición del cursor en el texto y la posición en los
 * dígitos. Se reportó que no se podía corregir sin borrarlo todo.
 */
import {
  borrarDigito, cursorTrasDigitos, digitosAntesDelCursor,
  insertarDigitos, separarMiles,
} from '../src/core/dinero';

const fmt = (d: string) => `$ ${separarMiles(Number(d || '0'))}`;

describe('traducción entre cursor y dígitos', () => {
  test('cuenta los dígitos que hay antes del cursor, ignorando puntos y símbolo', () => {
    const t = '$ 1.250.000'; // posiciones: 0='$',1=' ',2='1',3='.',4='2'...
    expect(digitosAntesDelCursor(t, 0)).toBe(0);
    expect(digitosAntesDelCursor(t, 3)).toBe(1);   // tras el "1"
    expect(digitosAntesDelCursor(t, 7)).toBe(4);   // tras "1.250"
    expect(digitosAntesDelCursor(t, t.length)).toBe(7);
  });

  test('coloca el cursor dejando a su izquierda los dígitos pedidos', () => {
    const t = '$ 1.250.000';
    expect(cursorTrasDigitos(t, 0)).toBe(0);
    expect(cursorTrasDigitos(t, 1)).toBe(3);
    expect(cursorTrasDigitos(t, 7)).toBe(t.length);
    // Más dígitos de los que hay: al final, sin romperse.
    expect(cursorTrasDigitos(t, 99)).toBe(t.length);
  });

  test('ida y vuelta: traducir y destraducir da la misma posición', () => {
    const t = '$ 4.250.900';
    for (let d = 0; d <= 7; d++) {
      expect(digitosAntesDelCursor(t, cursorTrasDigitos(t, d))).toBe(d);
    }
  });
});

describe('escribir y borrar en la posición del cursor', () => {
  test('inserta al final como un teclado normal', () => {
    expect(insertarDigitos('', 0, '4')).toBe('4');
    expect(insertarDigitos('4', 1, '5')).toBe('45');
    expect(insertarDigitos('45', 2, '000')).toBe('45000');
  });

  test('inserta en medio, que es lo que pedía el usuario', () => {
    // 45.000 y quiere que sea 45.900: pone el cursor y escribe el 9.
    expect(insertarDigitos('45000', 2, '9')).toBe('459000');
  });

  test('borra el dígito de antes del cursor, no todo el monto', () => {
    // 1.250.000 con el cursor tras el "2": debe quedar 1.50.000 -> 150000
    expect(borrarDigito('1250000', 2)).toBe('150000');
    expect(borrarDigito('45000', 5)).toBe('4500');
  });

  test('borrar al principio no hace nada y no lanza', () => {
    expect(borrarDigito('45000', 0)).toBe('45000');
    expect(borrarDigito('', 0)).toBe('');
  });

  test('no deja ceros a la izquierda ni montos absurdos', () => {
    expect(insertarDigitos('0', 1, '5')).toBe('5');
    expect(insertarDigitos('000', 3, '7')).toBe('7');
    expect(insertarDigitos('999999999999', 12, '9')).toHaveLength(12);
  });

  test('corregir un dígito concreto funciona de punta a punta', () => {
    // Escribió 45.000 pero era 46.000. Toca tras el "5", borra e inserta "6".
    let digitos = '45000';
    const cursor = cursorTrasDigitos(fmt(digitos), 2); // tras el "5"
    const pos = digitosAntesDelCursor(fmt(digitos), cursor);
    digitos = borrarDigito(digitos, pos);
    expect(digitos).toBe('4000');
    digitos = insertarDigitos(digitos, pos - 1, '6');
    expect(digitos).toBe('46000');
    expect(fmt(digitos)).toBe('$ 46.000');
  });
});

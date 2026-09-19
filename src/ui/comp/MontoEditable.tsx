import React from 'react';
import { TextInput, View } from 'react-native';
import { useTema } from '../TemaProvider';
import { NUM_TABULAR } from '../tema';
import { separarMiles } from '@/core/dinero';

/**
 * Monto grande y editable con cursor.
 *
 * Es un TextInput de verdad para que al tocar el número aparezca el cursor y
 * se pueda corregir un dígito concreto en vez de borrarlo todo. El teclado
 * del sistema NO se abre (`showSoftInputOnFocus={false}`): se escribe con el
 * teclado propio de la app, que inserta y borra en la posición del cursor.
 */
export function MontoEditable({
  digitos, cursor, onCursor, color, prefijo = '',
}: {
  digitos: string;
  cursor: number;
  onCursor: (pos: number) => void;
  color: string;
  prefijo?: string;
}) {
  const t = useTema();
  const monto = Number(digitos || '0');
  const texto = separarMiles(monto);
  const tam = texto.length > 11 ? 28 : texto.length > 8 ? 34 : 40;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <TextInput
        value={`${prefijo}$ ${texto}`}
        editable
        showSoftInputOnFocus={false}
        caretHidden={false}
        selection={{ start: cursor, end: cursor }}
        onSelectionChange={(e) => onCursor(e.nativeEvent.selection.start)}
        // No se edita por texto: los cambios entran por el teclado propio.
        onChangeText={() => {}}
        accessibilityLabel="Monto. Toca para colocar el cursor y corregir un dígito"
        style={{
          color, fontSize: tam, fontWeight: '800', letterSpacing: -1,
          textAlign: 'center', paddingVertical: 0, minWidth: 180,
          ...NUM_TABULAR,
        }}
        selectionColor={t.acento}
      />
    </View>
  );
}

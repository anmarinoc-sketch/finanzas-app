import { Redirect } from 'expo-router';

/**
 * El tab central no tiene pantalla propia: su boton abre /registro como modal.
 * Esta ruta solo existe para que el tab aparezca en la barra.
 */
export default function TabAgregar() {
  return <Redirect href="/registro" />;
}

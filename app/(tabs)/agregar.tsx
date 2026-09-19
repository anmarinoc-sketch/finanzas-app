import { Redirect } from 'expo-router';
import { conFrontera } from '@/ui/Frontera';

/**
 * El tab central no tiene pantalla propia: su boton abre /registro como modal.
 * Esta ruta solo existe para que el tab aparezca en la barra.
 */
function TabAgregar() {
  return <Redirect href="/registro" />;
}

// Cada pantalla en su propia frontera: un fallo aqui no tumba la app.
export default conFrontera(TabAgregar, 'Agregar');

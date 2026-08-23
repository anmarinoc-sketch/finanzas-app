import { format, startOfMonth, subMonths } from 'date-fns';
import { bdNativa, db } from './cliente';
import { BOLSILLOS_BASE } from '@/constantes/bolsillos';
import { CATEGORIAS_BASE } from '@/constantes/categorias';
import { COLORES_BOLSILLO } from '@/constantes/paleta';
import {
  bolsillos, categorias, cuentas, deudas, ingresos, metas, recurrentes, tarjetas,
} from './schema';
import {
  crearTransaccion, listarCategorias, listarCuentas, listarTarjetas,
  registrarAporte, guardarUsuario, obtenerUsuario,
} from './crud';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

export { BOLSILLOS_BASE } from '@/constantes/bolsillos';

/** Crea bolsillos y categorias por defecto si la base esta vacia. */
export function sembrarCatalogos() {
  const yaHay = db.select().from(bolsillos).all().length > 0;
  if (yaHay) return;

  bdNativa.withTransactionSync(() => {
    const idsBolsillo = new Map<string, number>();
    BOLSILLOS_BASE.forEach((b, i) => {
      const r = db.insert(bolsillos).values({
        nombre: b.nombre, tipo: b.tipo, porcentaje: b.porcentaje,
        color: COLORES_BOLSILLO[b.tipo], icono: b.icono, orden: i,
      }).run();
      idsBolsillo.set(b.tipo, Number(r.lastInsertRowId));
    });

    CATEGORIAS_BASE.forEach((c, i) => {
      const r = db.insert(categorias).values({
        nombre: c.nombre, icono: c.icono, color: c.color,
        bolsilloId: idsBolsillo.get(c.bolsillo) ?? null,
        orden: i, presupuestoMensual: 0,
      }).run();
      const padreId = Number(r.lastInsertRowId);
      (c.subcategorias ?? []).forEach((s) => {
        db.insert(categorias).values({
          nombre: s, icono: c.icono, color: c.color,
          bolsilloId: idsBolsillo.get(c.bolsillo) ?? null, padreId,
        }).run();
      });
    });

    db.insert(cuentas).values([
      { nombre: 'Efectivo', tipo: 'efectivo', saldoInicial: 200_000, color: '#22C55E', icono: 'cash-outline' },
      { nombre: 'Cuenta de ahorros', tipo: 'bancaria', saldoInicial: 2_500_000, banco: 'Bancolombia', color: '#EAB308', icono: 'business-outline' },
      { nombre: 'Nequi', tipo: 'digital', saldoInicial: 350_000, banco: 'Nequi', color: '#EC4899', icono: 'phone-portrait-outline' },
    ]).run();
  });
}

/** Generador pseudoaleatorio con semilla: el seed siempre produce lo mismo. */
function rng(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const COMERCIOS: Record<string, string[]> = {
  'Alimentación': ['Panadería La Espiga', 'Frutería del barrio', 'Tienda Doña Rosa', 'Almuerzo ejecutivo'],
  'Mercado': ['Éxito', 'D1', 'Ara', 'Justo & Bueno', 'Makro'],
  'Transporte': ['Uber', 'DiDi', 'TransMilenio', 'Taxi', 'Parqueadero centro'],
  'Restaurantes': ['Crepes & Waffles', 'Frisby', 'El Corral', 'Sushi Bar', 'Andrés Carne de Res'],
  'Combustible': ['Terpel', 'Primax', 'Biomax'],
  'Salud y medicamentos': ['Cruz Verde', 'Farmatodo', 'Consulta odontología'],
  'Ropa': ['Arturo Calle', 'Zara', 'Falabella'],
  'Ocio y entretenimiento': ['Cine Colombia', 'Bolera', 'Concierto', 'Bar La 85'],
  'Regalos': ['Regalo cumpleaños', 'Detalle aniversario'],
  'Mascotas': ['Veterinaria Patitas', 'Concentrado Dog Chow'],
  'Otros': ['Varios', 'Imprevisto'],
};

/**
 * Siembra 3 meses de movimientos realistas para un perfil colombiano de
 * ingresos medios. Sirve para ver la app funcionando desde el primer minuto.
 */
export function sembrarEjemplo() {
  sembrarCatalogos();
  const rand = rng(20260822);
  const cats = listarCategorias();
  const porNombre = (n: string) => cats.find((c) => c.nombre === n && !c.padreId);
  const sub = (n: string) => cats.find((c) => c.nombre === n && c.padreId);
  const ctas = listarCuentas();
  const cuentaBanco = ctas.find((c) => c.tipo === 'bancaria')?.id ?? null;
  const cuentaEfectivo = ctas.find((c) => c.tipo === 'efectivo')?.id ?? null;
  const cuentaNequi = ctas.find((c) => c.tipo === 'digital')?.id ?? null;

  if (!obtenerUsuario()) {
    guardarUsuario({
      nombre: 'Andrés', diaInicioCiclo: 1, tema: 'sistema',
      onboardingCompleto: 1, notificaciones: 1, creadoEn: iso(new Date()),
    });
  }

  bdNativa.withTransactionSync(() => {
    // --- Ingresos ---
    db.insert(ingresos).values([
      { nombre: 'Salario', monto: 2_400_000, frecuencia: 'quincenal', activo: 1, fechaInicio: iso(subMonths(new Date(), 6)), cuentaId: cuentaBanco },
      { nombre: 'Arriendo local', monto: 900_000, frecuencia: 'mensual', activo: 1, fechaInicio: iso(subMonths(new Date(), 6)), cuentaId: cuentaBanco },
    ]).run();

    // --- Tarjetas ---
    db.insert(tarjetas).values([
      { nombre: 'Visa Oro', banco: 'Bancolombia', cupoTotal: 8_000_000, diaCorte: 15, diaPago: 5, tasaInteres: 26.5, color: '#4F46E5' },
      { nombre: 'Mastercard', banco: 'Davivienda', cupoTotal: 4_000_000, diaCorte: 20, diaPago: 10, tasaInteres: 28.9, color: '#EF4444' },
    ]).run();

    // --- Deudas ---
    db.insert(deudas).values([
      { nombre: 'Crédito de vehículo', entidad: 'Banco de Bogotá', montoOriginal: 35_000_000, saldo: 21_400_000, tasa: 1.15, cuotaMensual: 890_000, plazoMeses: 60, diaPago: 8, color: '#EF4444', activa: 1 },
      { nombre: 'Crédito libre inversión', entidad: 'Bancolombia', montoOriginal: 8_000_000, saldo: 3_100_000, tasa: 1.65, cuotaMensual: 420_000, plazoMeses: 24, diaPago: 15, color: '#F59E0B', activa: 1 },
    ]).run();
  });

  const hoy = new Date();
  const tarjetasCreadas = listarTarjetas();
  const visa = tarjetasCreadas[0]?.id ?? null;

  // --- Presupuestos por categoria (mensuales) ---
  const presupuestos: Record<string, number> = {
    'Alimentación': 600_000, 'Mercado': 800_000, 'Servicios públicos': 450_000,
    'Arriendo / Vivienda': 1_500_000, 'Transporte': 350_000, 'Combustible': 320_000,
    'Restaurantes': 400_000, 'Ocio y entretenimiento': 300_000, 'Suscripciones': 130_000,
    'Salud y medicamentos': 200_000, 'Ropa': 200_000, 'Mascotas': 150_000, 'Otros': 150_000,
  };
  bdNativa.withTransactionSync(() => {
    for (const [nombre, monto] of Object.entries(presupuestos)) {
      const c = porNombre(nombre);
      if (c) bdNativa.runSync('UPDATE categorias SET presupuesto_mensual = ? WHERE id = ?', [monto, c.id]);
    }

    // --- Recurrentes y suscripciones ---
    const rec = (descripcion: string, monto: number, cat: string, dia: number, susc = 0, frecuencia = 'mensual') => {
      const c = porNombre(cat);
      const prox = new Date(hoy.getFullYear(), hoy.getMonth() + (hoy.getDate() > dia ? 1 : 0), dia);
      db.insert(recurrentes).values({
        descripcion, monto, frecuencia: frecuencia as any, categoriaId: c?.id ?? null,
        cuentaId: cuentaBanco, medioPago: 'debito', proximaFecha: iso(prox),
        activo: 1, esSuscripcion: susc, tipo: 'gasto',
      }).run();
    };
    rec('Arriendo apartamento', 1_500_000, 'Arriendo / Vivienda', 5);
    rec('Internet fibra', 89_900, 'Servicios públicos', 12, 1);
    rec('Plan celular', 65_000, 'Servicios públicos', 18, 1);
    rec('Netflix', 44_900, 'Suscripciones', 7, 1);
    rec('Spotify Familiar', 26_900, 'Suscripciones', 14, 1);
    rec('Gimnasio Smart Fit', 79_900, 'Gimnasio', 3, 1);
    rec('Seguro del carro', 1_450_000, 'Seguros', 22, 0, 'anual');
    rec('Energía', 180_000, 'Servicios públicos', 20);
    rec('Agua', 95_000, 'Servicios públicos', 20);
  });

  // --- Metas de ahorro ---
  const metaIds: number[] = [];
  bdNativa.withTransactionSync(() => {
    const crear = (nombre: string, objetivo: number, mesesLimite: number, color: string, icono: string, prioridad: number, creadaHaceMeses: number) => {
      const r = db.insert(metas).values({
        nombre, montoObjetivo: objetivo, montoActual: 0,
        fechaLimite: iso(new Date(hoy.getFullYear(), hoy.getMonth() + mesesLimite, 15)),
        color, icono, prioridad, aporteAutomatico: 0, estado: 'en_curso',
        fechaCreacion: iso(subMonths(hoy, creadaHaceMeses)), archivada: 0,
      }).run();
      metaIds.push(Number(r.lastInsertRowId));
    };
    crear('Fondo de emergencia', 12_000_000, 14, '#10B981', 'umbrella-outline', 1, 6);
    crear('Viaje a San Andrés', 5_000_000, 7, '#06B6D4', 'airplane-outline', 2, 4);
    crear('Cambio de computador', 4_500_000, 10, '#8B5CF6', 'desktop-outline', 3, 3);
  });

  // Aportes mensuales a las metas durante los ultimos 4 meses.
  const aportes = [[600_000, 350_000, 200_000], [600_000, 400_000, 150_000], [750_000, 300_000, 250_000], [600_000, 500_000, 0]];
  aportes.forEach((fila, i) => {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - (3 - i), 28);
    if (fecha > hoy) return;
    fila.forEach((monto, j) => {
      if (monto > 0 && metaIds[j]) registrarAporte(metaIds[j], monto, 'aporte', 'Aporte mensual programado', fecha);
    });
  });

  // --- 3 meses de movimientos ---
  const inicio = startOfMonth(subMonths(hoy, 2));
  const medios = ['efectivo', 'debito', 'nequi', 'credito', 'daviplata'] as const;
  const cuentasPosibles = [cuentaBanco, cuentaEfectivo, cuentaNequi];

  const plan: { cat: string; min: number; max: number; porMes: number }[] = [
    { cat: 'Alimentación', min: 8_000, max: 35_000, porMes: 22 },
    { cat: 'Mercado', min: 60_000, max: 320_000, porMes: 5 },
    { cat: 'Transporte', min: 3_000, max: 28_000, porMes: 18 },
    { cat: 'Restaurantes', min: 25_000, max: 180_000, porMes: 7 },
    { cat: 'Combustible', min: 60_000, max: 130_000, porMes: 3 },
    { cat: 'Ocio y entretenimiento', min: 20_000, max: 150_000, porMes: 4 },
    { cat: 'Salud y medicamentos', min: 15_000, max: 190_000, porMes: 2 },
    { cat: 'Ropa', min: 60_000, max: 260_000, porMes: 1 },
    { cat: 'Mascotas', min: 30_000, max: 120_000, porMes: 2 },
    { cat: 'Regalos', min: 40_000, max: 150_000, porMes: 1 },
    { cat: 'Otros', min: 10_000, max: 90_000, porMes: 3 },
  ];

  bdNativa.withTransactionSync(() => {
    for (let mes = 0; mes < 3; mes++) {
      const base = new Date(inicio.getFullYear(), inicio.getMonth() + mes, 1);
      const diasMes = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();

      // Ingresos quincenales del salario + arriendo del local.
      [15, diasMes].forEach((dia) => {
        const f = new Date(base.getFullYear(), base.getMonth(), dia);
        if (f > hoy) return;
        crearTransaccion({
          tipo: 'ingreso', monto: 2_400_000, fecha: iso(f), cuentaId: cuentaBanco,
          medioPago: 'transferencia', descripcion: 'Salario quincena', etiquetas: 'salario',
          creadoEn: iso(f),
        } as any);
      });
      const fArr = new Date(base.getFullYear(), base.getMonth(), 3);
      if (fArr <= hoy) {
        crearTransaccion({
          tipo: 'ingreso', monto: 900_000, fecha: iso(fArr), cuentaId: cuentaBanco,
          medioPago: 'transferencia', descripcion: 'Arriendo local comercial',
          etiquetas: 'renta', creadoEn: iso(fArr),
        } as any);
      }

      // Gastos fijos del mes.
      const fijos: [string, number, number, string][] = [
        ['Arriendo / Vivienda', 1_500_000, 5, 'Arriendo apartamento'],
        ['Servicios públicos', 180_000, 20, 'Energía'],
        ['Servicios públicos', 95_000, 20, 'Agua'],
        ['Servicios públicos', 89_900, 12, 'Internet fibra'],
        ['Servicios públicos', 65_000, 18, 'Plan celular'],
        ['Suscripciones', 44_900, 7, 'Netflix'],
        ['Suscripciones', 26_900, 14, 'Spotify Familiar'],
        ['Gimnasio', 79_900, 3, 'Gimnasio Smart Fit'],
      ];
      for (const [cat, monto, dia, desc] of fijos) {
        const f = new Date(base.getFullYear(), base.getMonth(), Math.min(dia, diasMes));
        if (f > hoy) continue;
        const c = porNombre(cat);
        const subId = cat === 'Servicios públicos' ? sub(desc)?.id ?? null : null;
        crearTransaccion({
          tipo: 'gasto', monto, fecha: iso(f), categoriaId: subId ?? c?.id ?? null,
          subcategoriaId: subId, cuentaId: cuentaBanco, medioPago: 'debito',
          descripcion: desc, etiquetas: 'fijo', creadoEn: iso(f),
        } as any);
      }

      // Gastos variables.
      for (const p of plan) {
        const c = porNombre(p.cat);
        const veces = Math.max(1, Math.round(p.porMes * (0.8 + rand() * 0.4)));
        for (let k = 0; k < veces; k++) {
          const dia = 1 + Math.floor(rand() * diasMes);
          const f = new Date(base.getFullYear(), base.getMonth(), Math.min(dia, diasMes));
          if (f > hoy) continue;
          // Los fines de semana se gasta mas: refuerza los patrones del mapa de calor.
          const finde = f.getDay() === 5 || f.getDay() === 6;
          const factor = finde ? 1.35 : 1;
          const monto = Math.round((p.min + rand() * (p.max - p.min)) * factor / 100) * 100;
          const nombres = COMERCIOS[p.cat] ?? [p.cat];
          crearTransaccion({
            tipo: 'gasto', monto, fecha: iso(f), categoriaId: c?.id ?? null,
            cuentaId: cuentasPosibles[Math.floor(rand() * cuentasPosibles.length)] ?? cuentaBanco,
            medioPago: medios[Math.floor(rand() * medios.length)],
            descripcion: nombres[Math.floor(rand() * nombres.length)],
            etiquetas: '', creadoEn: iso(f),
          } as any);
        }
      }
    }
  });

  // Dos compras diferidas a cuotas con la Visa: alimentan el modulo de tarjetas.
  const fCompra1 = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 12);
  crearTransaccion({
    tipo: 'gasto', monto: 3_600_000, fecha: iso(fCompra1),
    categoriaId: porNombre('Otros')?.id ?? null, tarjetaId: visa,
    medioPago: 'credito', descripcion: 'Nevera Samsung', cuotas: 12,
    etiquetas: 'electrodomésticos', creadoEn: iso(fCompra1),
  } as any);

  const fCompra2 = new Date(hoy.getFullYear(), hoy.getMonth() - 2, 25);
  crearTransaccion({
    tipo: 'gasto', monto: 1_800_000, fecha: iso(fCompra2),
    categoriaId: porNombre('Ropa')?.id ?? null, tarjetaId: visa,
    medioPago: 'credito', descripcion: 'Vuelos Avianca', cuotas: 6,
    etiquetas: 'viaje', creadoEn: iso(fCompra2),
  } as any);

  // Transferencia entre cuentas: no debe contarse como gasto en ningun grafico.
  const fTrans = new Date(hoy.getFullYear(), hoy.getMonth(), Math.min(10, hoy.getDate()));
  crearTransaccion({
    tipo: 'transferencia', monto: 400_000, fecha: iso(fTrans),
    cuentaId: cuentaBanco, cuentaDestinoId: cuentaNequi, medioPago: 'transferencia',
    descripcion: 'Paso a Nequi', etiquetas: '', creadoEn: iso(fTrans),
  } as any);

  // Ingreso extra ocasional.
  const fBono = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 20);
  crearTransaccion({
    tipo: 'ingreso', monto: 750_000, fecha: iso(fBono), cuentaId: cuentaBanco,
    medioPago: 'transferencia', descripcion: 'Bono por resultados',
    etiquetas: 'bono,extra', creadoEn: iso(fBono),
  } as any);
}

/** ¿La base ya tiene movimientos? Se usa para no sembrar dos veces. */
export function hayDatos(): boolean {
  const r = bdNativa.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM transacciones');
  return (r?.n ?? 0) > 0;
}

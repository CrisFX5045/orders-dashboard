import {
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import clsx from "clsx";
import {
  FaCheck,
  FaChevronDown,
  FaCopy,
  FaEye,
  FaLightbulb,
  FaMoneyBillWave,
  FaPlus,
  FaRegStickyNote,
  FaSearch,
  FaTrash,
} from "react-icons/fa";

import { Badge, Button, Card, Input, Select, Textarea } from "@/components/ui";
import tsePadronUrl from "@/assets/docs/personas-tse/PADRON_COMPLETO.txt?url";

const STORAGE_KEY = "orders-dashboard-state-v2";
const LEGACY_STORAGE_KEY = "orders-dashboard-state-v1";

type TseIndex = Map<string, string>;
type TseLoadState = {
  status: "idle" | "loading" | "ready" | "error";
  count: number;
  loadedBytes: number;
  totalBytes: number | null;
};
type TseProgress = Pick<TseLoadState, "count" | "loadedBytes" | "totalBytes">;

let tseIndexCache: TseIndex | null = null;
let tseIndexPromise: Promise<TseIndex> | null = null;

type PaymentMethod =
  | ""
  | "simpe"
  | "transferencia"
  | "contra-efectivo"
  | "contra-tarjeta"
  | "banco-nacional"
  | "compra-click"
  | "credix"
  | "emma"
  | "apartado";

type ShippingZone = "" | "gam" | "fuera-gam";
type ShippingMethod = "" | "correos" | "encomiendas" | "lte";
type SpecialFlow = "" | "solo-licencias" | "reserva-tienda" | "cambio-con-valor" | "cambio-sin-valor" | "transferencia";
type Template = "" | "laptop" | "credix" | "envio" | "licencias";
type MessageTemplateId =
  | "inicio"
  | "cotizacion"
  | "cotizacion-pc"
  | "apartados"
  | "reserva"
  | "fuera-stock"
  | "credix-virtual"
  | "pedir-datos-envio"
  | "sinpe"
  | "compra-click-credid"
  | "pedido-confirmado"
  | "pedido-confirmado-fuera-gam"
  | "pedido-tienda"
  | "transferencia-tienda"
  | "guia"
  | "aun-no-facturado"
  | "garantia"
  | "devolucion-dinero"
  | "ensamble-listo"
  | "cierre";

type CaseNote = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  orderNumber: string;
  customerName: string;
  cedula: string;
  phone: string;
  email: string;
  skuList: string;
  products: CaseProduct[];
  generatedNote: string;
  freeNote: string;
  total: string;
  hasLaptop: boolean;
  needsInstall: boolean;
  hasGift: boolean;
  requiresInvoice: boolean;
  paymentMethod: PaymentMethod;
  shippingZone: ShippingZone;
  shippingMethod: ShippingMethod;
  apartadoTerm: "24h" | "1w" | "1m" | "3m";
  specialFlow: SpecialFlow;
  confirmsReceipt: string;
  simpeConfirmedBy: string;
  selectedMessageTemplate: MessageTemplateId;
  stockContact: string;
  transferRoute: string;
  commentNote: string;
  checkedSteps: Record<string, boolean>;
  categoryIds: string[];
  credixStartedAt: number | null;
};

type AppState = {
  cases: CaseNote[];
  windows: CaseWindowState[];
  infoWindows: InfoWindowState[];
  categories: NoteCategory[];
  doubtQuery: string;
};

type CaseWindowState = {
  caseId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
};

type InfoWindowState = {
  entryId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z: number;
};

type SearchEntry = {
  id: string;
  title: string;
  category: string;
  body: string;
  keywords: string;
};

type Tipification = {
  code: string;
  label: string;
};

type CategoryColor = string;

type NoteCategory = {
  id: string;
  name: string;
  color: CategoryColor;
};

type CaseProduct = {
  id: string;
  code: string;
  needsTransfer: boolean;
};

const defaultCategories: NoteCategory[] = [
  { id: "transfer-store", name: "Traslado de producto a tienda", color: "#0ea5e9" },
  { id: "store-reservation", name: "Reserva de producto en tienda", color: "#22c55e" },
  { id: "stock-check", name: "Consulta de stock", color: "#f59e0b" },
  { id: "financing", name: "Financiamiento", color: "#8b5cf6" },
  { id: "invoice-followup", name: "Factura / seguimiento de pedido", color: "#ef4444" },
];

const paymentLabels: Record<PaymentMethod, string> = {
  "": "Sin pago",
  simpe: "SIMPE",
  transferencia: "Transferencia",
  "contra-efectivo": "Contra entrega efectivo/SIMPE",
  "contra-tarjeta": "Contra entrega tarjeta",
  "banco-nacional": "Banco Nacional",
  "compra-click": "Compra Click / Wallet",
  credix: "Credix",
  emma: "EMMA",
  apartado: "Apartado",
};

const tipifications: Tipification[] = [
  { code: "*101", label: "Consulta de Stock conoce la pagina" },
  { code: "*102", label: "Reenvio de Facturas" },
  { code: "*103", label: "Gestion - Venta en tienda" },
  { code: "*104", label: "Venta" },
  { code: "*105", label: "Cliente en espera de su pedido" },
  { code: "*106", label: "Garantia" },
  { code: "*107", label: "Asesoramiento - Cotizacion" },
  { code: "*108", label: "Soporte tecnico de articulos" },
  { code: "*109", label: "Consulta producto agotado" },
  { code: "*110", label: "Transferida a otro agente" },
  { code: "*112", label: "Transferencias sucursal" },
  { code: "*113", label: "Consulta Ubicaciones - Horario" },
  { code: "*114", label: "Consulta de stock NO conoce Pagina" },
  { code: "*115", label: "Corporativo" },
  { code: "*116", label: "Consulta outlet" },
  { code: "*117", label: "Consulta por financiamiento" },
  { code: "*119", label: "Transferencia Administrativa" },
  { code: "*120", label: "Numero Equivocado" },
  { code: "*121", label: "Consulta Pedidos Pagina Web" },
  { code: "*122", label: "Quejas" },
  { code: "*123", label: "Notas de Credito" },
  { code: "*124", label: "Consulta Devolucion de Dinero" },
  { code: "*125", label: "Consulta/Venta Promociones Extreme Tech" },
];

const knowledge = [
  {
    keys: "factura electronica hacienda cedula",
    title: "Factura electronica",
    body: "Si no aparece la cedula en Finanzas PRO, consultar ovitribucr.hacienda.go.cr. Si aparece en Hacienda, enviar a Supervisor.",
  },
  {
    keys: "credix codigo app 10 minutos supervisor",
    title: "Credix",
    body: "El codigo dura 10 minutos. El cliente debe mantener la app abierta. Pasar codigo a Supervisor y poner Confirmado (Supervisor).",
  },
  {
    keys: "simpe sinpe movil empresas crux consultores confirmar pago",
    title: "Confirmacion SIMPE",
    body: "Los pagos SIMPE se confirman en Sinpe Movil Empresas. El confirmador predeterminado sos vos.",
  },
  {
    keys: "emma qr cedula credid comprobante",
    title: "EMMA",
    body: "Validar Credid con cedula por ambos lados, enviar QR de ExtremeTech, solicitar comprobante y confirmar con Supervisor.",
  },
  {
    keys: "correos costa rica monserrat guia casa sucursal",
    title: "Correos de Costa Rica",
    body: "Consultas con Monserrat a comunicacionescedi@extremetechcr.com. Especificar casa o sucursal. La guia de Drive sirve hasta final del dia.",
  },
  {
    keys: "licencia licencias orders ensamble correo",
    title: "Solo licencias",
    body: "No se sube a ORDERS si pide solo licencias. Se crean y se envia correo. Si van en ensamble, si se sube.",
  },
  {
    keys: "apartado porcentaje orden 24h semana mes",
    title: "Apartados",
    body: "24h: 0% sin orden. 1 semana: 10%. 1 mes: 20%. 3 meses: 40%. Mas de 24h requiere crear orden.",
  },
  {
    keys: "descuento sinpe transferencia efectivo cuatro por ciento",
    title: "Descuento por pago",
    body: "Si paga con SINPE, transferencia bancaria o efectivo, se puede realizar un 4% de descuento.",
  },
  {
    keys: "ensamble costo gratis windows 11 licencia office",
    title: "Ensamble y licencias",
    body: "Si compra los componentes con Extreme Tech, el ensamble es gratis e incluye instalacion de Windows 11 sin licencia. Windows 11 Pro: 20,000; Office 2019: 25,000; Office 2021: 28,000.",
  },
  {
    keys: "envio costo gam fuera encomienda correos paquetes sillas",
    title: "Costos de envio",
    body: "GAM: 3,000 paquetes pequenos y 5,000 paquetes grandes. Fuera GAM por encomienda: 3,500 pequenos, 5,000 grandes o sillas. Correos varia: aprox. 4,000 GAM, 4,300 pequenos fuera GAM, 6,200 grandes/sillas.",
  },
  {
    keys: "garantia factura tienda encomienda servicio al cliente",
    title: "Garantias",
    body: "Garantia por defectos de fabrica por 1 ano. Puede aplicar en tienda con factura fisica/digital; si es lejano, enviar por encomienda coordinando con servicioalcliente@extremetechcr.com.",
  },
  {
    keys: "devolucion dinero seguimientosac nota credito lunes jueves",
    title: "Devolucion de dinero",
    body: "Enviar a seguimientosac@extremetechcr.com factura, nota de credito o comprobante del banco y motivo. Devoluciones se realizan lunes o jueves.",
  },
];

const messageTemplates: {
  id: MessageTemplateId;
  label: string;
  category: string;
  build: (note: CaseNote) => string;
}[] = [
  {
    id: "inicio",
    label: "Inicio de chat",
    category: "Atencion",
    build: () => "Gracias por contactar con Extreme Tech, ____ te atiende.",
  },
  {
    id: "cotizacion",
    label: "Cotizacion general",
    category: "Ventas",
    build: () =>
      "Te facilito esta cotizacion. Recuerda confirmar disponibilidad al momento de realizar tu compra, ya que esta sujeta a disponibilidad de bodegas y tiendas. Tambien podemos hacer mas facil tu compra por medio de nuestro servicio de envio.",
  },
  {
    id: "cotizacion-pc",
    label: "Cotizacion de PC",
    category: "Ventas",
    build: () =>
      "Te facilito esta cotizacion en modo de sugerencia con los componentes mas cercanos disponibles respecto a lo que solicitas. Recuerda confirmar disponibilidad al momento de realizar tu compra. Tambien podemos ayudarte con envio.",
  },
  {
    id: "apartados",
    label: "Apartados",
    category: "Ventas",
    build: () =>
      "Actualmente te podemos ofrecer estos plazos para apartados:\n1. Apartado de palabra por 24 horas.\n2. 10% del valor total: 1 semana.\n3. 20% del valor total: 1 mes.\n4. 40% del valor total: 3 meses.\n\nRecuerda que los apartados una vez pagados no permiten cambios o devoluciones.",
  },
  {
    id: "reserva",
    label: "Reserva 24h",
    category: "Ventas",
    build: () =>
      "Te podemos ayudar con la reserva del articulo por 24 horas. Para proceder, por favor indicame:\n- Nombre completo\n- Numero de cedula\n- Correo electronico\n- Numero telefonico",
  },
  {
    id: "fuera-stock",
    label: "Fuera de stock",
    category: "Ventas",
    build: () =>
      "Actualmente, segun el sistema, este articulo se encuentra fuera de stock. Sin embargo, te puedo ofrecer un modelo similar si gustas.",
  },
  {
    id: "credix-virtual",
    label: "Credix virtual",
    category: "Pagos",
    build: () =>
      "Para proceder con el pago por la aplicacion, ingresa a Productos y escoge compra sin tarjeta. La app te dara un codigo de 10 digitos con validez de 10 minutos. Cuando tenga todo listo te aviso para que me envies el codigo.",
  },
  {
    id: "pedir-datos-envio",
    label: "Pedir datos de envio",
    category: "Envios",
    build: () =>
      "Para coordinar el envio, por favor facilitame:\n1. Nombre completo (dos nombres y dos apellidos)\n2. Correo electronico\n3. Cedula incluyendo ceros (formato 0 0000 0000)\n4. Direccion exacta: provincia, canton, distrito, barrio, casa/edificio/color, etc.\n5. Uno o dos numeros telefonicos\n\nMetodos de pago: SINPE, transferencia bancaria o link de pago. En zonas con mensajeria interna tambien efectivo completo o tarjeta.",
  },
  {
    id: "sinpe",
    label: "SINPE movil",
    category: "Pagos",
    build: (note) =>
      `Te adjunto el numero SINPE para realizar el deposito por tu pedido${note.total ? ` por un monto de ${note.total} colones` : ""}${note.orderNumber ? ` (Order ${note.orderNumber})` : ""}. Por favor colocar en el detalle el numero de orden e indicarnos el numero de cedula de la persona que realizo el pago para ligarlo a la orden.\n\nSINPE movil: 70185574\nA nombre de Extreme Technology o Nexus Videojuegos.\n\nPor favor enviar el comprobante en 24 horas; caso contrario la orden se cerrara y los articulos se pondran a disposicion del publico nuevamente.`,
  },
  {
    id: "compra-click-credid",
    label: "Compra Click / Credid",
    category: "Pagos",
    build: () =>
      "Con este link ingresaras a la solicitud de Credid, donde te solicitaran:\n- Fotografia de la cedula por ambos lados\n- Fotografia de la tarjeta donde se vea el nombre y los ultimos 4 digitos (puedes tapar lo demas)\n- Selfie con cedula y tarjeta en mano\n- Carta de autorizacion si aplica\n\nEstos requisitos se solicitan por seguridad debido al aumento de estafas con tarjetas.",
  },
  {
    id: "pedido-confirmado",
    label: "Pedido confirmado GAM",
    category: "Seguimiento",
    build: (note) =>
      `${note.customerName || "____"}, actualmente tu pedido ha sido confirmado.\n\nPara consultas, tu Orden de Pedido es: *${note.orderNumber || "____"}*. Una vez entregada la factura al correo, el numero para consultas sera la referencia interna de la factura.\n\nLos companeros de mensajeria te contactaran via telefonica, agradecemos estar pendiente.`,
  },
  {
    id: "pedido-confirmado-fuera-gam",
    label: "Pedido confirmado fuera GAM",
    category: "Seguimiento",
    build: (note) =>
      `${note.customerName || "____"}, actualmente tu pedido ha sido confirmado.\n\nPara consultas, tu Orden de Pedido es: *${note.orderNumber || "____"}*. Puedes consultar 24 o 48 horas despues de que te llegue la factura al correo y con gusto te brindaremos el numero de guia si ya esta disponible.`,
  },
  {
    id: "pedido-tienda",
    label: "Pedido confirmado tienda",
    category: "Seguimiento",
    build: () =>
      "Su pedido en tienda ha sido confirmado. Puede asistir a la sucursal a retirarlo apenas le llegue la factura al correo electronico brindado. Para retirarlo debe presentar la factura. Si un tercero retira, debe presentar fotocopia de la cedula del dueno, carta de autorizacion firmada y documento de factura.",
  },
  {
    id: "transferencia-tienda",
    label: "Transferencia a tienda",
    category: "Seguimiento",
    build: () =>
      "Su pedido de transferencia ha sido confirmado. Cuando el articulo ingrese a la sucursal, los companeros se comunicaran contigo para que pases a cancelarlo. Las transferencias a tiendas pueden tardar entre 24 y 72 horas habiles, con posibilidad de retraso por alta demanda o disponibilidad.",
  },
  {
    id: "guia",
    label: "Numero de guia",
    category: "Seguimiento",
    build: (note) =>
      `Muy buenas ${note.customerName || "____"}, te adjunto el numero de guia de la empresa ____ emitido el ____.\n\nNumero: ____`,
  },
  {
    id: "aun-no-facturado",
    label: "Aun no facturado",
    category: "Seguimiento",
    build: () =>
      "Su pedido Orden *____* se encuentra en cola de facturacion. Espero pronto sea facturado para proceder con el despacho. Se espera que aproximadamente en 24 horas habiles se este despachando.",
  },
  {
    id: "garantia",
    label: "Garantia",
    category: "Soporte",
    build: () =>
      "Todos nuestros articulos tienen 1 ano de garantia por defectos de fabrica. Para aplicarla puedes presentarte a la tienda mas cercana con la factura fisica o digital. Si estas lejos, puedes enviar el articulo por encomienda coordinando con servicioalcliente@extremetechcr.com.",
  },
  {
    id: "devolucion-dinero",
    label: "Devolucion de dinero",
    category: "Soporte",
    build: () =>
      "Lamentamos el inconveniente. Para solicitar devolucion de dinero, por favor enviar a seguimientosac@extremetechcr.com:\n- PDF de factura, si aplica\n- PDF de nota de credito o comprobante del banco\n- Motivo de la devolucion\n\nLas devoluciones se realizan los lunes o jueves, segun el dia en que se envie la solicitud.",
  },
  {
    id: "ensamble-listo",
    label: "Ensamble listo",
    category: "Seguimiento",
    build: (note) =>
      `Hola ${note.customerName || "____"}. Queremos informarle que su computadora ensamblada ya esta lista para que pase a recogerla en nuestra tienda. Le esperamos en Extreme Tech [nombre de la tienda]. Gracias y esperamos verle pronto.`,
  },
  {
    id: "cierre",
    label: "Cierre",
    category: "Atencion",
    build: () => "______ te atendio, fue un gusto atenderle.",
  },
];

const pdfKnowledge: SearchEntry[] = [
  {
    id: "pdf-bac-cuentas",
    category: "PDF v3 / Bancos",
    title: "BAC, Banco Nacional y BCR - cuentas bancarias",
    keywords: "bac banco nacional bcr iban transferencia cuentas bancaria dolares colones",
    body:
      "Cuentas bancarias para deposito por pedido. Extreme Technology Corp ETC S.A 3-101-735870.\n\nBAC San Jose Extreme Technology Corp ETC S.A\n- Cuenta corriente BAC colones: 931328702\n- IBAN colones: CR06010200009313287022\n- Cuenta corriente BAC dolares: 931328694\n- IBAN dolares: CR59010200009313286941\n\nBanco Nacional Extreme Technology Corp ETC S.A\n- Cuenta corriente BN colones: 200-01-004-155957-8\n- Cuenta cliente: 15100420011559575\n- IBAN: CR89015100420011559575\n- Cuenta corriente BN dolares: 200-02-004-517676-8\n- Cuenta cliente: 15100420025176760\n- IBAN: CR44015100420025176760\n\nBanco de Costa Rica Extreme Technology Corp ETC S.A\n- Cuenta corriente BCR colones: 001-0418603-6\n- Cuenta cliente: 15201001041860361\n- IBAN colones: CR22015201001041860361\n- Cuenta corriente BCR dolares: 001-0418609-5\n- Cuenta cliente: 15201001041860958\n- IBAN dolares: CR05015201001041860958\n\nSINPE movil: 70185574. Si desea cancelar en dolares, debe indicarlo antes de pagar para evitar problemas con el tipo de cambio.",
  },
  {
    id: "pdf-compra-click-credid",
    category: "PDF v3 / Pagos",
    title: "Compra Click / Credid - documentos y datos",
    keywords: "compra click credid bac link tarjeta selfie cedula carta autorizacion datos jefatura",
    body:
      "Para Compra Click / Credid se solicita al cliente:\n- Fotografia de la cedula por ambos lados.\n- Fotografia de la tarjeta donde se vea el nombre y los ultimos 4 digitos; puede tapar lo demas.\n- Selfie con cedula en mano y tarjeta en mano.\n- Carta de autorizacion si aplica.\n\nPara pedir el link a jefatura se debe enviar:\n- Numero de cedula del cliente.\n- Nombre del cliente.\n- Numero telefonico o correo electronico.\n- Tipo de carta que necesita firmar, o indicar si no necesita carta.\n- OP.\n- Monto.\n- Plazo.\n\nRecordatorio: son los datos del dueno de la tarjeta. En pedidos con mensajeria interna, el mensajero solicitara identificacion y fotografias al entregar.",
  },
  {
    id: "pdf-financiamiento-bac",
    category: "PDF v3 / Financiamiento",
    title: "Financiamientos: BAC, Credix, Promerica, BN, EMMA",
    keywords: "bac credomatic minicoutas tasa cero credix promerica banco nacional emma financiamiento",
    body:
      "Entidades financieras afiliadas:\n\nLafise: tasa cero 3, 6 y 12 meses con tarjeta Extreme Gold. Se cobra de contado y la solicitud de traslado a tasa cero se tramita directamente con el banco.\n\nCredix: tasa cero 3 y 6 meses. Tasa cero 10 y 12 meses en productos seleccionados. Financiamiento de 18, 24 y 36 meses con tasa de interes mensual.\n\nBAC Credomatic: tasa cero 3 y 6 meses. Tasa cero 12 y 24 meses en productos seleccionados. BAC Mini cuotas a 12, 18, 24 o 36 meses con tasa de interes mensual.\n\nBanco Promerica: tasa cero 3 y 6 meses sin comision de credito. Nanocuotas con plazos desde 12 hasta 60 meses.\n\nBanco Nacional: tasa cero 3 y 6 meses solo en tiendas.\n\nEMMA / Grupo Unicomer: plazos desde 1 mes hasta 36 meses, con tasa de interes mensual aproximada de 2.78% a 4.5% segun perfil.",
  },
  {
    id: "pdf-envios-costos",
    category: "PDF v3 / Envios",
    title: "Envios GAM, fuera GAM, Correos y encomiendas",
    keywords: "envio gam fuera gam correos encomienda costo paquete silla mensajeria entrega plazo",
    body:
      "Envios dentro de GAM: mensajeria propia. Paquetes pequenos 3,000 colones; paquetes grandes 5,000 colones.\n\nFuera de GAM: servicio de encomienda de preferencia o Correos de Costa Rica, despachado desde CEDI. Encomienda: paquetes pequenos 3,500 colones; paquetes grandes y sillas 5,000 colones cada una.\n\nCorreos de Costa Rica: dentro de GAM 4,000 colones. Paquetes pequenos fuera de GAM 4,300 colones. Paquetes grandes y sillas 6,200 colones.\n\nPlazo aproximado: si el articulo esta en CEDI o tienda dentro de GAM, entrega aprox. 24 horas habiles. Si viene de tienda lejana puede variar.\n\nMetodos de pago segun ubicacion: dentro de GAM contra entrega en tarjeta o efectivo, transferencia o SINPE. Fuera de cobertura puede usarse Compra Click BAC y financiamientos.",
  },
  {
    id: "pdf-datos-envio",
    category: "PDF v3 / Envios",
    title: "Datos necesarios para coordinar envio",
    keywords: "pedir datos envio nombre cedula correo telefono direccion mayor edad recibe entrega",
    body:
      "Datos para coordinar envio:\n1. Nombre completo: dos nombres y dos apellidos.\n2. Correo electronico.\n3. Cedula incluyendo ceros, formato 0 0000 0000.\n4. Direccion exacta: provincia, canton, distrito, barrio, casa/edificio/color, etc. Si es fuera de GAM, indicar encomienda de preferencia.\n5. Uno o dos numeros telefonicos.\n\nConfirmar que el titular de la orden es quien recibe la entrega. Los datos deben ser suministrados por una persona mayor de edad.\n\nSi puede recibir otra persona dentro de GAM, pedir: nombre completo, cedula y telefono de quien recibe. Si esa persona no esta en la zona de entrega, el pedido se devuelve a bodega para reprogramar.",
  },
  {
    id: "pdf-ensamble-licencias",
    category: "PDF v3 / Ensamble",
    title: "Ensamble, Windows y licencias",
    keywords: "ensamble windows licencia office pc armado gratis mantenimiento taller",
    body:
      "Si compra los componentes con Extreme Tech, el ensamble es gratis y se instala Windows 11 sin licencia.\n\nTiempo de ensamble: 24 a 72 horas habiles, con posibilidad de retraso por alta demanda o disponibilidad.\n\nLaptops: incluyen licencia de Windows 11. Equipos de escritorio: se instala version de prueba de Windows sin costo adicional, usable indefinidamente con limitaciones.\n\nLicencias ofrecidas:\n- Windows 11 Pro: 20,000 colones.\n- Office 2019: 25,000 colones.\n- Office 2021: 28,000 colones.\nUna vez brindada la licencia, tiene 1 dia habil para activarla.",
  },
  {
    id: "pdf-correos-internos",
    category: "PDF v3 / Correos internos",
    title: "Correos internos segun tramite",
    keywords: "correos internos nota credito apartado comprobante compra click credix licencias traslados refacturacion",
    body:
      "Notas de credito: enrique.cespedes@extremetechcr.com, inventario.cedi@extremetechcr.com, jefecallcenter@extremetechcr.com, coordinador.callcenter@extremetechcr.com. Si es cancelacion de pedido, agregar envios@extremetechcr.com dentro GAM o comunicacionescedi@extremetechcr.com fuera GAM.\n\nApartados: liquidaciones@extremetechcr.com, facturacion@extremetechcr.com, jefecallcenter@extremetechcr.com, coordinador.callcenter@extremetechcr.com. Agregar envios@extremetechcr.com dentro GAM o comunicacionescedi@extremetechcr.com fuera GAM.\n\nComprobante Compra Click / Credix: liquidaciones@extremetechcr.com, facturacion@extremetechcr.com, jefecallcenter@extremetechcr.com, coordinador.callcenter@extremetechcr.com. Tambien agregar envios@extremetechcr.com dentro GAM o comunicacionescedi@extremetechcr.com fuera GAM.\n\nLicencias: comunicacionescedi@extremetechcr.com, seguimientosac@extremetechcr.com, facturacion@extremetechcr.com, coordinador.callcenter@extremetechcr.com.\n\nTraslados de dinero: tesoreria@extremetechcr.com, contabilidad01@extremetechcr.com, contadorgeneral@extremetechcr.com, contabilidad@extremetechcr.com, asistentecontable@extremetechcr.com, coordinador.callcenter@extremetechcr.com.\n\nRefacturacion por Hacienda: seguimientosac@extremetechcr.com, coordinador.callcenter@extremetechcr.com, gestiondecalidad@extremetechcr.com, jefecallcenter@extremetechcr.com.",
  },
  {
    id: "txt-factura-electronica",
    category: "textos.txt",
    title: "Factura electronica - flujo interno",
    keywords: "factura electronica hacienda ovitribu finanzas pro actividad supervisor cambio facturacion",
    body:
      "Dar click en el check de requiere factura electronica.\n\nConsultar ovitribucr.hacienda.go.cr.\n\nNota: si no aparece nada con la cedula en Finanzas PRO, ahi se consulta en ovitribu. Si aparece en Hacienda, mandar a Supervisor para que meta la actividad a Finanzas PRO.\n\nPara cambios de facturacion, ver Articulos Especiales.",
  },
];

const searchEntries: SearchEntry[] = [
  ...tipifications.map((item) => ({
    id: `tipification-${item.code}`,
    title: `${item.code} ${item.label}`,
    category: "Tipificaciones",
    body: `Codigo: ${item.code}\nTipificacion: ${item.label}`,
    keywords: `${item.code} ${item.label}`,
  })),
  ...knowledge.map((item) => ({
    id: `knowledge-${item.title.toLowerCase().replace(/\W+/g, "-")}`,
    title: item.title,
    category: "Dudas",
    body: item.body,
    keywords: item.keys,
  })),
  ...messageTemplates.map((template) => ({
    id: `template-${template.id}`,
    title: template.label,
    category: `Plantilla / ${template.category}`,
    body: template.build(createCase()),
    keywords: `${template.label} ${template.category} ${template.id}`,
  })),
  ...pdfKnowledge,
];

function createCase(template: Template = "", createdAt = Date.now()): CaseNote {
  const now = createdAt;
  const base: CaseNote = {
    id: crypto.randomUUID(),
    title: "Nueva nota de caso",
    createdAt: now,
    updatedAt: now,
    orderNumber: "",
    customerName: "",
    cedula: "",
    phone: "",
    email: "",
    skuList: "",
    products: [],
    generatedNote: "",
    freeNote: "",
    total: "",
    hasLaptop: false,
    needsInstall: false,
    hasGift: false,
    requiresInvoice: false,
    paymentMethod: "",
    shippingZone: "",
    shippingMethod: "",
    apartadoTerm: "24h",
    specialFlow: "",
    confirmsReceipt: "",
    simpeConfirmedBy: "Yo",
    selectedMessageTemplate: "inicio",
    stockContact: "",
    transferRoute: "",
    commentNote: "",
    checkedSteps: {},
    categoryIds: [],
    credixStartedAt: null,
  };

  if (template === "laptop") {
    return {
      ...base,
      title: "Laptop con preparacion",
      hasLaptop: true,
      needsInstall: true,
      commentNote: "Recordar abrir empaque y marcar Requiere Ensamble.",
    };
  }

  if (template === "credix") {
    return {
      ...base,
      title: "Pago Credix",
      paymentMethod: "credix",
      commentNote: "Cliente debe mantener la app abierta.",
    };
  }

  if (template === "envio") {
    return {
      ...base,
      title: "Orden con envio",
      shippingZone: "gam",
      shippingMethod: "correos",
    };
  }

  if (template === "licencias") {
    return {
      ...base,
      title: "Solo licencias",
      specialFlow: "solo-licencias",
      needsInstall: true,
    };
  }

  return base;
}

function loadState(): AppState {
  if (typeof window === "undefined") {
    return { cases: [], windows: [], infoWindows: [], categories: defaultCategories, doubtQuery: "" };
  }

  for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
    try {
      const saved = window.localStorage.getItem(key);
      if (!saved) continue;
      const parsed = JSON.parse(saved) as Partial<AppState> & {
        activeCaseId?: string;
        openCaseId?: string | null;
        search?: string;
      };
      const migratedWindowId = parsed.openCaseId ?? parsed.activeCaseId ?? null;
      return {
        cases: Array.isArray(parsed.cases) ? parsed.cases.map(normalizeCase) : [],
        windows: Array.isArray(parsed.windows)
          ? parsed.windows
          : migratedWindowId
            ? [createWindow(migratedWindowId, 0)]
            : [],
        infoWindows: Array.isArray(parsed.infoWindows) ? parsed.infoWindows : [],
        categories: mergeCategories(Array.isArray(parsed.categories) ? parsed.categories : []),
        doubtQuery: parsed.doubtQuery ?? parsed.search ?? "",
      };
    } catch {
      window.localStorage.removeItem(key);
    }
  }

  return { cases: [], windows: [], infoWindows: [], categories: defaultCategories, doubtQuery: "" };
}

function createWindow(caseId: string, index: number, z = 20): CaseWindowState {
  const offset = Math.min(index * 34, 180);
  return {
    caseId,
    x: 72 + offset,
    y: 92 + offset,
    width: 940,
    height: 680,
    z: z + index,
  };
}

function getNextZ(windows: CaseWindowState[]) {
  return Math.max(20, ...windows.map((item) => item.z)) + 1;
}

function createInfoWindow(entryId: string, index: number, z = 30): InfoWindowState {
  const offset = Math.min(index * 28, 160);
  return {
    entryId,
    x: 110 + offset,
    y: 110 + offset,
    width: 720,
    height: 560,
    z: z + index,
  };
}

function getNextInfoZ(windows: InfoWindowState[]) {
  return Math.max(30, ...windows.map((item) => item.z)) + 1;
}

function normalizeCase(item: Partial<CaseNote>): CaseNote {
  return {
    ...createCase(),
    ...item,
    updatedAt: item.updatedAt ?? item.createdAt ?? Date.now(),
    checkedSteps: item.checkedSteps ?? {},
    categoryIds: item.categoryIds?.slice(0, 1) ?? [],
    products: normalizeProducts(item),
    generatedNote: item.generatedNote ?? "",
  };
}

function mergeCategories(saved: Partial<NoteCategory>[]) {
  const normalized = saved
    .filter((item): item is NoteCategory => !!item.id && !!item.name && !!item.color)
    .map((item) => ({ id: item.id, name: item.name, color: normalizeColor(item.color) }));

  return [
    ...defaultCategories,
    ...normalized.filter((item) => !defaultCategories.some((category) => category.id === item.id)),
  ];
}

function normalizeProducts(item: Partial<CaseNote>) {
  if (Array.isArray(item.products)) {
    return item.products
      .filter((product) => product && typeof product.code === "string")
      .map((product) => ({
        id: product.id || crypto.randomUUID(),
        code: product.code,
        needsTransfer: !!product.needsTransfer,
      }));
  }

  return item.skuList?.trim()
    ? [
        {
          id: crypto.randomUUID(),
          code: item.skuList,
          needsTransfer: false,
        },
      ]
    : [];
}

function normalizeColor(color: string) {
  const legacy: Record<string, string> = {
    blue: "#0ea5e9",
    green: "#22c55e",
    amber: "#f59e0b",
    rose: "#ef4444",
    violet: "#8b5cf6",
    slate: "#64748b",
  };

  if (legacy[color]) return legacy[color];
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  return "#64748b";
}

function getTipification(code: string) {
  return tipifications.find((item) => item.code === code) ?? tipifications[6];
}

function hasAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function isStoreReservation(note: CaseNote) {
  const text = [note.title, note.skuList, note.freeNote, note.commentNote, note.stockContact]
    .join(" ")
    .toLowerCase();

  return (
    note.specialFlow === "reserva-tienda" ||
    hasAny(text, [
      "reserva 24",
      "reservar 24",
      "reserva de 24",
      "24 horas",
      "ir a comprar",
      "comprar en tienda",
      "va a tienda",
      "retira en tienda",
      "retiro en tienda",
      "pasar a tienda",
    ])
  );
}

function inferTipification(note: CaseNote): Tipification {
  const text = [
    note.title,
    note.skuList,
    note.freeNote,
    note.commentNote,
    note.orderNumber,
    note.stockContact,
    note.transferRoute,
    paymentLabels[note.paymentMethod],
  ]
    .join(" ")
    .toLowerCase();
  const hasProducts = !!note.skuList.trim();
  const hasSaleSignal = !!note.total.trim() || !!note.paymentMethod || !!note.orderNumber.trim();

  if (isStoreReservation(note)) return getTipification("*103");
  if (hasAny(text, ["numero equivocado", "equivocado", "no era", "llamada erronea"])) return getTipification("*120");
  if (hasAny(text, ["queja", "molesto", "reclamo", "mala atencion", "denuncia"])) return getTipification("*122");
  if (hasAny(text, ["devolucion de dinero", "devolver dinero", "reembolso"])) return getTipification("*124");
  if (note.specialFlow === "cambio-con-valor" || note.specialFlow === "cambio-sin-valor" || hasAny(text, ["nota de credito", "nc"])) {
    return getTipification("*123");
  }
  if (note.requiresInvoice || hasAny(text, ["factura", "reenviar factura", "reenvio factura"])) return getTipification("*102");
  if (hasAny(text, ["garantia", "garantía", "rma"])) return getTipification("*106");
  if (hasAny(text, ["soporte", "tecnico", "técnico", "no enciende", "instalar", "driver", "configurar"])) return getTipification("*108");
  if (hasAny(text, ["promocion", "promoción", "promo", "descuento", "oferta"])) return getTipification("*125");
  if (hasAny(text, ["outlet"])) return getTipification("*116");
  if (hasAny(text, ["corporativo", "empresa", "licitacion", "licitación", "mayoreo"])) return getTipification("*115");
  if (hasAny(text, ["ubicacion", "ubicación", "horario", "sucursal", "donde estan", "donde queda"])) return getTipification("*113");
  if (hasAny(text, ["transferir agente", "otro agente", "transferida"])) return getTipification("*110");
  if (note.specialFlow === "transferencia" || note.transferRoute || hasAny(text, ["transferencia sucursal", "traslado", "traer de tienda"])) {
    return getTipification("*112");
  }
  if (hasAny(text, ["transferencia administrativa", "administrativa"])) return getTipification("*119");
  if (["credix", "emma", "compra-click", "banco-nacional", "apartado"].includes(note.paymentMethod) || hasAny(text, ["financiamiento", "bac", "credix", "emma", "promerica", "minicuotas", "tasa cero"])) {
    return getTipification("*117");
  }
  if (hasAny(text, ["pedido pagina", "pedido web", "pagina web", "página web"])) return getTipification("*121");
  if (note.orderNumber || hasAny(text, ["guia", "guía", "facturado", "despacho", "en espera", "pedido"])) return getTipification("*105");
  if (hasAny(text, ["agotado", "sin stock", "no hay stock", "fuera de stock"])) return getTipification("*109");
  if (hasAny(text, ["stock", "disponible", "disponibilidad"])) {
    return hasProducts || hasAny(text, ["pagina", "página", "web", "sku"]) ? getTipification("*101") : getTipification("*114");
  }
  if (hasAny(text, ["tienda", "retira", "recoger", "retiro en tienda"])) return getTipification("*103");
  if (hasProducts && hasSaleSignal) return getTipification("*104");
  if (hasProducts || hasAny(text, ["cotizacion", "cotización", "asesoria", "asesoría", "recomendar", "consulta producto"])) {
    return getTipification("*107");
  }

  return getTipification("*107");
}

function getCedulaVariants(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return [];

  const variants: { label: string; value: string }[] = [
    { label: "Sin guiones", value: digits },
  ];

  const add = (label: string, formatted: string) => {
    if (formatted && !variants.some((item) => item.value === formatted)) {
      variants.push({ label, value: formatted });
    }
  };

  const addCompletedCedula = () => {
    if (digits.length === 7 || digits.length === 8) {
      const grouped = `${digits.slice(0, 1)}${digits.slice(1, 4).padStart(4, "0")}${digits.slice(4).padStart(4, "0")}`;
      if (grouped.length === 9) {
        add("Con ceros faltantes", grouped);
      }
    }
  };

  if (digits.length === 7) {
    add("Con guiones", `${digits.slice(0, 1)}-${digits.slice(1, 4)}-${digits.slice(4)}`);
  } else if (digits.length === 8) {
    add("Con guiones", `${digits.slice(0, 1)}-${digits.slice(1, 4)}-${digits.slice(4)}`);
  } else if (digits.length === 9) {
    add("Con guiones", `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5)}`);
  }

  if (digits.length >= 10) {
    add("Juridica", `${digits.slice(0, 1)}-${digits.slice(1, 4)}-${digits.slice(4)}`);
  }

  addCompletedCedula();

  return variants;
}

function cleanTseNamePart(value: string | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function addTseLineToIndex(line: string, index: TseIndex) {
  if (!line.trim()) return;
  const parts = line.split(",");
  const cedula = parts[0]?.trim();
  if (!cedula) return;

  const name = [
    cleanTseNamePart(parts[5]),
    cleanTseNamePart(parts[6]),
    cleanTseNamePart(parts[7]),
  ]
    .filter(Boolean)
    .join(" ");

  if (name) index.set(cedula, name);
}

async function parseTseStream(response: Response, onProgress?: (progress: TseProgress) => void) {
  const index: TseIndex = new Map();
  const reader = response.body?.getReader();
  const contentLength = Number(response.headers.get("content-length"));
  const totalBytes = Number.isFinite(contentLength) && contentLength > 0 ? contentLength : null;

  if (!reader) {
    const text = await response.text();
    const loadedBytes = text.length;
    text.split(/\r?\n/).forEach((line, count) => {
      addTseLineToIndex(line, index);
      if (count > 0 && count % 50000 === 0) {
        onProgress?.({ count: index.size, loadedBytes, totalBytes: totalBytes ?? loadedBytes });
      }
    });
    return index;
  }

  const decoder = new TextDecoder("utf-8");
  let pending = "";
  let processed = 0;
  let loadedBytes = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    loadedBytes += value.byteLength;
    pending += decoder.decode(value, { stream: true });
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? "";

    for (const line of lines) {
      addTseLineToIndex(line, index);
      processed += 1;
      if (processed % 50000 === 0) onProgress?.({ count: index.size, loadedBytes, totalBytes });
    }
  }

  pending += decoder.decode();
  addTseLineToIndex(pending, index);
  onProgress?.({ count: index.size, loadedBytes: totalBytes ?? loadedBytes, totalBytes });
  return index;
}

function loadTseIndex(onProgress?: (progress: TseProgress) => void) {
  if (tseIndexCache) return Promise.resolve(tseIndexCache);
  if (tseIndexPromise) return tseIndexPromise;

  tseIndexPromise = fetch(tsePadronUrl)
    .then((response) => {
      if (!response.ok) throw new Error("No se pudo cargar el padron TSE");
      return parseTseStream(response, onProgress);
    })
    .then((index) => {
      tseIndexCache = index;
      return index;
    })
    .catch((error) => {
      tseIndexPromise = null;
      throw error;
    });

  return tseIndexPromise;
}

function getCedulaLookupKeys(value: string) {
  const keys = new Set<string>();
  const digits = value.replace(/\D/g, "");
  if (digits) keys.add(digits);

  getCedulaVariants(value).forEach((item) => {
    const normalized = item.value.replace(/\D/g, "");
    if (normalized) keys.add(normalized);
  });

  return Array.from(keys);
}

function findTseName(value: string, index: TseIndex | null) {
  if (!index) return "";
  for (const key of getCedulaLookupKeys(value)) {
    const match = index.get(key);
    if (match) return match;
  }
  return "";
}

function formatAgo(timestamp: number) {
  const diff = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (diff < 60) return `hace ${diff} min`;
  return `hace ${Math.floor(diff / 60)} h`;
}

function formatDateTime(timestamp: number) {
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function formatShortDate(timestamp: number) {
  return new Intl.DateTimeFormat("es-CR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

function formatDayName(timestamp: number) {
  return new Intl.DateTimeFormat("es-CR", {
    weekday: "short",
  }).format(new Date(timestamp));
}

function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toDayKey(timestamp: number | Date) {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDayKey(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getStartOfWeek(date: Date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
}

function getMonthWeeks(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const firstWeek = getStartOfWeek(monthStart);
  const weeks: Date[] = [];
  let cursorTime = firstWeek.getTime();

  while (cursorTime <= monthEnd.getTime() || weeks.length === 0) {
    const cursor = new Date(cursorTime);
    weeks.push(new Date(cursor));
    cursorTime = cursor.setDate(cursor.getDate() + 7);
  }

  return weeks;
}

function getNoteCountForDay(notes: CaseNote[], dayKey: string) {
  return notes.filter((note) => toDayKey(note.createdAt) === dayKey).length;
}

function getNoteCountForWeek(notes: CaseNote[], weekStart: Date) {
  const days = new Set(getWeekDays(weekStart).map(toDayKey));
  return notes.filter((note) => days.has(toDayKey(note.createdAt))).length;
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CR", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

function getSelectedCategories(note: CaseNote, categories: NoteCategory[]) {
  return note.categoryIds
    .slice(0, 1)
    .map((id) => categories.find((category) => category.id === id))
    .filter((category): category is NoteCategory => !!category);
}

function categoryClasses(_color: CategoryColor, selected = true) {
  return selected
    ? "border-gray-300 bg-gray-50 text-gray-800 dark:border-dark-500 dark:bg-dark-700 dark:text-dark-50"
    : "border-gray-200 bg-white text-gray-600 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100";
}

function categoryAccentClass() {
  return "border-l-gray-300 dark:border-l-dark-500";
}

function categoryAccentStyle(color?: CategoryColor) {
  return color ? { borderLeftColor: normalizeColor(color) } : undefined;
}

function categoryChipStyle(color: string, selected = true) {
  const normalized = normalizeColor(color);

  return {
    borderColor: selected ? normalized : `${normalized}55`,
    backgroundColor: selected ? `${normalized}18` : undefined,
    boxShadow: selected ? `inset 0 0 0 1px ${normalized}22` : undefined,
  };
}

function buildProductLine(product: CaseProduct) {
  const code = product.code.trim() || "Pendiente";
  if (!product.needsTransfer) return code;
  return `// TRANS ${code} VIENE *Cambiar por lugar* VA PARA *Cambiar por lugar*`;
}

function buildGeneratedNote(note: CaseNote) {
  const products = note.products.length > 0 ? note.products : normalizeProducts(note);
  const productLines = products.length > 0 ? products.map(buildProductLine).join("\n") : "Pendiente";
  const paymentMethod = note.total?.trim();

  return [
    paymentMethod ? `//METODO DE PAGO ${paymentMethod}` : undefined,
    `Nombre de cliente: ${note.customerName || "Pendiente"}`,
    `Cedula: ${note.cedula || "Pendiente"}`,
    `Telefono: ${note.phone || "Pendiente"}`,
    `Correo de cliente: ${note.email || "Pendiente"}`,
    "SKU de productos:",
    productLines,
  ]
    .filter(Boolean)
    .join("\n");
}

export default function OrdersDashboard() {
  const [state, setState] = useState<AppState>(loadState);
  const [tseIndex, setTseIndex] = useState<TseIndex | null>(tseIndexCache);
  const [tseLoadState, setTseLoadState] = useState<TseLoadState>({
    status: tseIndexCache ? "ready" : "idle",
    count: tseIndexCache?.size ?? 0,
    loadedBytes: 0,
    totalBytes: null,
  });
  const [template, setTemplate] = useState<Template>("");
  const today = useMemo(() => new Date(), []);
  const [selectedMonth, setSelectedMonth] = useState(toMonthKey(today));
  const [selectedWeekStart, setSelectedWeekStart] = useState(toDayKey(getStartOfWeek(today)));
  const [selectedDay, setSelectedDay] = useState(toDayKey(today));

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    let active = true;
    setTseLoadState((current) =>
      current.status === "ready"
        ? current
        : {
            status: "loading",
            count: current.count,
            loadedBytes: current.loadedBytes,
            totalBytes: current.totalBytes,
          },
    );

    void loadTseIndex((progress) => {
      if (active) setTseLoadState({ status: "loading", ...progress });
    })
      .then((index) => {
        if (!active) return;
        setTseIndex(index);
        setTseLoadState((current) => ({
          status: "ready",
          count: index.size,
          loadedBytes: current.totalBytes ?? current.loadedBytes,
          totalBytes: current.totalBytes,
        }));
      })
      .catch(() => {
        if (active) {
          setTseLoadState({
            status: "error",
            count: 0,
            loadedBytes: 0,
            totalBytes: null,
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const monthWeeks = useMemo(() => getMonthWeeks(selectedMonth), [selectedMonth]);
  const activeWeekStart = useMemo(() => {
    const current = monthWeeks.find((week) => toDayKey(week) === selectedWeekStart);
    return current ?? monthWeeks[0] ?? getStartOfWeek(new Date());
  }, [monthWeeks, selectedWeekStart]);
  const activeWeekDays = useMemo(() => getWeekDays(activeWeekStart), [activeWeekStart]);
  const visibleCases = useMemo(
    () =>
      state.cases
        .filter((note) => toDayKey(note.createdAt) === selectedDay)
        .sort((a, b) => b.createdAt - a.createdAt),
    [selectedDay, state.cases],
  );
  const selectedDayDate = useMemo(() => parseDayKey(selectedDay), [selectedDay]);

  const filteredSearchEntries = useMemo(() => {
    const query = state.doubtQuery.trim().toLowerCase();
    if (!query) return [];
    const words = query.split(/\s+/).filter(Boolean);

    return searchEntries
      .map((entry) => {
        const haystack = `${entry.title} ${entry.category} ${entry.body} ${entry.keywords}`.toLowerCase();
        const score = words.reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0);
        const titleBoost = entry.title.toLowerCase().includes(query) ? 3 : 0;
        return { entry, score: score + titleBoost };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
      .slice(0, 12)
      .map((item) => item.entry);
  }, [state.doubtQuery]);

  const addNote = (selectedTemplate = template) => {
    const targetDate = parseDayKey(selectedDay);
    const now = new Date();
    targetDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    const note = createCase(selectedTemplate, targetDate.getTime());
    setState((current) => ({
      ...current,
      cases: [note, ...current.cases],
      windows: [
        ...current.windows,
        createWindow(note.id, current.windows.length, getNextZ(current.windows)),
      ],
    }));
    setTemplate("");
  };

  const updateNote = (id: string, patch: Partial<CaseNote>) => {
    setState((current) => ({
      ...current,
      cases: current.cases.map((note) =>
        note.id === id ? { ...note, ...patch, updatedAt: Date.now() } : note,
      ),
    }));
  };

  const deleteNote = (id: string) => {
    setState((current) => ({
      ...current,
      cases: current.cases.filter((note) => note.id !== id),
      windows: current.windows.filter((item) => item.caseId !== id),
    }));
  };

  const openWindow = (caseId: string) => {
    setState((current) => {
      const existing = current.windows.find((item) => item.caseId === caseId);
      const nextZ = getNextZ(current.windows);
      if (existing) {
        return {
          ...current,
          windows: current.windows.map((item) =>
            item.caseId === caseId ? { ...item, z: nextZ } : item,
          ),
        };
      }

      return {
        ...current,
        windows: [
          ...current.windows,
          createWindow(caseId, current.windows.length, nextZ),
        ],
      };
    });
  };

  const closeWindow = (caseId: string) => {
    setState((current) => ({
      ...current,
      windows: current.windows.filter((item) => item.caseId !== caseId),
    }));
  };

  const patchWindow = (caseId: string, patch: Partial<CaseWindowState>) => {
    setState((current) => ({
      ...current,
      windows: current.windows.map((item) =>
        item.caseId === caseId ? { ...item, ...patch } : item,
      ),
    }));
  };

  const focusWindow = (caseId: string) => {
    setState((current) => ({
      ...current,
      windows: current.windows.map((item) =>
        item.caseId === caseId ? { ...item, z: getNextZ(current.windows) } : item,
      ),
    }));
  };

  const openInfoWindow = (entryId: string) => {
    setState((current) => {
      const existing = current.infoWindows.find((item) => item.entryId === entryId);
      const nextZ = getNextInfoZ(current.infoWindows);
      if (existing) {
        return {
          ...current,
          doubtQuery: "",
          infoWindows: current.infoWindows.map((item) =>
            item.entryId === entryId ? { ...item, z: nextZ } : item,
          ),
        };
      }

      return {
        ...current,
        doubtQuery: "",
        infoWindows: [
          ...current.infoWindows,
          createInfoWindow(entryId, current.infoWindows.length, nextZ),
        ],
      };
    });
  };

  const closeInfoWindow = (entryId: string) => {
    setState((current) => ({
      ...current,
      infoWindows: current.infoWindows.filter((item) => item.entryId !== entryId),
    }));
  };

  const patchInfoWindow = (entryId: string, patch: Partial<InfoWindowState>) => {
    setState((current) => ({
      ...current,
      infoWindows: current.infoWindows.map((item) =>
        item.entryId === entryId ? { ...item, ...patch } : item,
      ),
    }));
  };

  const focusInfoWindow = (entryId: string) => {
    setState((current) => ({
      ...current,
      infoWindows: current.infoWindows.map((item) =>
        item.entryId === entryId
          ? { ...item, z: getNextInfoZ(current.infoWindows) }
          : item,
      ),
    }));
  };

  const toggleCategory = (note: CaseNote, categoryId: string) => {
    const exists = note.categoryIds.includes(categoryId);
    updateNote(note.id, {
      categoryIds: exists ? [] : [categoryId],
    });
  };

  const addCategoryToNote = (note: CaseNote, name: string, color: CategoryColor) => {
    const cleanName = name.trim();
    if (!cleanName) return;

    const id = `custom-${Date.now()}-${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const category: NoteCategory = { id, name: cleanName, color };

    setState((current) => ({
      ...current,
      categories: [...current.categories, category],
      cases: current.cases.map((item) =>
        item.id === note.id
          ? {
              ...item,
              categoryIds: [id],
              updatedAt: Date.now(),
            }
          : item,
      ),
    }));
  };

  const selectMonth = (monthKey: string) => {
    if (!/^\d{4}-\d{2}$/.test(monthKey)) return;

    const weeks = getMonthWeeks(monthKey);
    const firstWeek = weeks[0] ?? getStartOfWeek(new Date());
    const firstMonthDay = new Date(`${monthKey}-01T00:00:00`);
    setSelectedMonth(monthKey);
    setSelectedWeekStart(toDayKey(firstWeek));
    setSelectedDay(toDayKey(firstMonthDay));
  };

  const selectWeek = (weekStart: Date) => {
    setSelectedWeekStart(toDayKey(weekStart));
    const days = getWeekDays(weekStart);
    const inMonth = days.find((day) => toMonthKey(day) === selectedMonth) ?? days[0];
    setSelectedDay(toDayKey(inMonth));
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-dark-900 dark:text-dark-50">
      <style>
        {`
          @keyframes case-window-in {
            from { opacity: 0; transform: translateY(10px) scale(.985); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .case-window-in {
            animation: case-window-in 180ms ease-out;
          }
        `}
      </style>
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-dark-600 dark:bg-dark-800/90 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
              <FaRegStickyNote />
              Libreta operativa
            </div>
            <h1 className="mt-1 text-xl font-semibold tracking-normal text-gray-950 dark:text-white">
              DASHBOARD DE notas de caso
            </h1>
          </div>

          <div className="flex flex-1 flex-col gap-2 lg:max-w-2xl lg:flex-row">
            <div className="relative flex-1">
              <Input
                value={state.doubtQuery}
                onChange={(event) =>
                  setState((current) => ({ ...current, doubtQuery: event.target.value }))
                }
                placeholder="Buscar duda rapida: Credix, Emma, Correos..."
                prefix={<FaSearch className="size-4" />}
                className="h-10"
                aria-label="Buscador de dudas"
              />
              {filteredSearchEntries.length > 0 && (
                <Card
                  skin="bordered"
                  className="absolute left-0 right-0 top-12 z-40 max-h-96 overflow-auto rounded-lg bg-white p-2 shadow-lg dark:bg-dark-700"
                >
                  {filteredSearchEntries.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="w-full rounded-md p-3 text-left transition hover:bg-gray-50 dark:hover:bg-dark-600"
                      onClick={() => openInfoWindow(item.id)}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        <FaLightbulb className="text-warning" />
                        {item.title}
                      </div>
                      <div className="mt-1 text-xs font-medium text-primary-600 dark:text-primary-400">
                        {item.category}
                      </div>
                      <p className="mt-1 max-h-10 overflow-hidden text-sm leading-5 text-gray-600 dark:text-dark-200">
                        {item.body}
                      </p>
                    </button>
                  ))}
                </Card>
              )}
            </div>

            <div className="flex gap-2">
              <Select
                value={template}
                onChange={(event) => setTemplate(event.target.value as Template)}
                className="h-10 w-full min-w-0"
                classNames={{ root: "w-full sm:w-56" }}
                aria-label="Plantilla rapida"
                data={[
                  { label: "Sin plantilla", value: "" }
                ]}
              />
              <Button color="primary" className="h-10 shrink-0 gap-2 rounded-md px-4" onClick={() => addNote()}>
                <FaPlus />
                Nota
              </Button>
            </div>
          </div>
        </div>
      </header>

      <TseLoadToast state={tseLoadState} />

      <main className="mx-auto grid max-w-[92rem] gap-6 px-4 py-7 lg:grid-cols-[minmax(0,1fr)_320px] sm:px-6">
        <section className="min-w-0 space-y-5">
          <Card skin="bordered" className="rounded-lg bg-white p-4 dark:bg-dark-800">
            <div>
              <div className="mb-3">
                <div className="text-xs font-semibold uppercase text-primary-600 dark:text-primary-400">
                  {monthLabel(selectedMonth)}
                </div>
                <h2 className="mt-1 text-lg font-semibold text-gray-950 dark:text-white">
                  {formatShortDate(selectedDayDate.getTime())}
                </h2>
              </div>
              <DayTabs
                days={activeWeekDays}
                notes={state.cases}
                selectedDay={selectedDay}
                selectedMonth={selectedMonth}
                onSelectDay={setSelectedDay}
              />
            </div>
          </Card>

          {visibleCases.length === 0 ? (
            <EmptyState
              dateLabel={formatShortDate(selectedDayDate.getTime())}
              onCreate={() => addNote("")}
            />
          ) : (
            <div className="grid gap-5 2xl:grid-cols-2">
              {visibleCases.map((note) => (
                <CaseCard
                  key={note.id}
                  note={note}
                  categories={state.categories}
                  tseIndex={tseIndex}
                  tseReady={tseLoadState.status === "ready"}
                  isOpen={false}
                  onOpen={() => openWindow(note.id)}
                  onUpdate={(patch) => updateNote(note.id, patch)}
                  onDelete={() => deleteNote(note.id)}
                  onToggleCategory={(categoryId) => toggleCategory(note, categoryId)}
                  onAddCategory={(name, color) => addCategoryToNote(note, name, color)}
                />
              ))}
            </div>
          )}
        </section>

        <CalendarSidebar
          monthKey={selectedMonth}
          weeks={monthWeeks}
          notes={state.cases}
          selectedWeekStart={toDayKey(activeWeekStart)}
          selectedDay={selectedDay}
          onSelectMonth={selectMonth}
          onSelectWeek={selectWeek}
          onSelectDay={setSelectedDay}
        />
      </main>

      {state.windows.map((windowState) => {
        const note = state.cases.find((item) => item.id === windowState.caseId);
        if (!note) return null;

        return (
          <CaseWindow
            key={windowState.caseId}
            note={note}
            categories={state.categories}
            tseIndex={tseIndex}
            tseReady={tseLoadState.status === "ready"}
            windowState={windowState}
            onFocus={() => focusWindow(note.id)}
            onClose={() => closeWindow(note.id)}
            onPatchWindow={(patch) => patchWindow(note.id, patch)}
            onUpdate={(patch) => updateNote(note.id, patch)}
            onDelete={() => deleteNote(note.id)}
            onToggleCategory={(categoryId) => toggleCategory(note, categoryId)}
            onAddCategory={(name, color) => addCategoryToNote(note, name, color)}
          />
        );
      })}

      {state.infoWindows.map((windowState) => {
        const entry = searchEntries.find((item) => item.id === windowState.entryId);
        if (!entry) return null;

        return (
          <InfoWindow
            key={windowState.entryId}
            entry={entry}
            windowState={windowState}
            onFocus={() => focusInfoWindow(entry.id)}
            onClose={() => closeInfoWindow(entry.id)}
            onPatchWindow={(patch) => patchInfoWindow(entry.id, patch)}
          />
        );
      })}
    </div>
  );
}

function EmptyState({ dateLabel, onCreate }: { dateLabel?: string; onCreate: () => void }) {
  return (
    <button
      type="button"
      onClick={onCreate}
      className="grid min-h-[55vh] w-full place-items-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-8 text-center transition hover:border-primary-400 hover:bg-primary-50/40 dark:border-dark-500 dark:bg-dark-800 dark:hover:border-primary-500 dark:hover:bg-primary-500/10"
    >
      <span>
        <span className="mx-auto grid size-16 place-items-center rounded-lg bg-primary-50 text-2xl text-primary-600 dark:bg-primary-500/10">
          <FaPlus />
        </span>
        <span className="mt-4 block text-lg font-semibold">Crear primera nota de caso</span>
        <span className="mt-2 block max-w-md text-sm leading-6 text-gray-500 dark:text-dark-200">
          {dateLabel
            ? `No hay notas para ${dateLabel}. Crea una nota y quedara guardada en este dia.`
            : "La nota se ve simple al inicio. Al abrirla, puedes completar datos, tipificacion y categoria."}
        </span>
      </span>
    </button>
  );
}

function TseLoadToast({ state }: { state: TseLoadState }) {
  if (state.status === "idle" || state.status === "ready") return null;

  const progress =
    state.totalBytes && state.totalBytes > 0
      ? Math.min(100, Math.round((state.loadedBytes / state.totalBytes) * 100))
      : null;

  const text =
    state.status === "loading"
      ? `Cargando padron TSE... ${state.count.toLocaleString("es-CR")} personas`
      : "No se pudo cargar el padron TSE";

  return (
    <div
      className={clsx(
        "fixed right-4 top-20 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border px-4 pb-4 pt-3 text-sm shadow-lg",
        state.status === "error"
          ? "border-error/30 bg-error/10 text-error"
          : "border-info/30 bg-white text-gray-700 dark:bg-dark-800 dark:text-dark-100",
      )}
    >
      <div className="font-semibold">
        {state.status === "loading" ? "Preparando busqueda TSE" : "Busqueda TSE"}
      </div>
      <div className="mt-1 text-xs leading-5">{text}</div>
      {state.status === "loading" && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-600">
            <div
              className={clsx(
                "h-full rounded-full bg-info transition-all duration-300",
                progress === null && "w-1/2 animate-pulse",
              )}
              style={progress === null ? undefined : { width: `${progress}%` }}
            />
          </div>
          <div className="mt-1 text-right text-[11px] font-medium text-gray-500 dark:text-dark-200">
            {progress === null ? "Procesando archivo" : `${progress}%`}
          </div>
        </div>
      )}
    </div>
  );
}

function DayTabs({
  days,
  notes,
  selectedDay,
  selectedMonth,
  onSelectDay,
}: {
  days: Date[];
  notes: CaseNote[];
  selectedDay: string;
  selectedMonth: string;
  onSelectDay: (dayKey: string) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-gray-600 dark:text-dark-200">Dias de la semana</div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const dayKey = toDayKey(day);
          const count = getNoteCountForDay(notes, dayKey);
          const active = dayKey === selectedDay;
          const outsideMonth = toMonthKey(day) !== selectedMonth;

          return (
            <button
              key={dayKey}
              type="button"
              onClick={() => onSelectDay(dayKey)}
              className={clsx(
                "min-h-14 rounded-md border px-1.5 py-2 text-center transition",
                active
                  ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300"
                  : "border-gray-200 bg-white hover:border-primary-300 dark:border-dark-600 dark:bg-dark-700",
                outsideMonth && "opacity-45",
              )}
            >
              <span className="block text-[11px] font-semibold uppercase">{formatDayName(day.getTime())}</span>
              <span className="mt-0.5 block text-base font-semibold">{day.getDate()}</span>
              <span className="mt-1 inline-flex min-w-5 justify-center rounded-full bg-gray-100 px-1.5 text-[11px] text-gray-600 dark:bg-dark-600 dark:text-dark-100">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarSidebar({
  monthKey,
  weeks,
  notes,
  selectedWeekStart,
  selectedDay,
  onSelectMonth,
  onSelectWeek,
  onSelectDay,
}: {
  monthKey: string;
  weeks: Date[];
  notes: CaseNote[];
  selectedWeekStart: string;
  selectedDay: string;
  onSelectMonth: (monthKey: string) => void;
  onSelectWeek: (weekStart: Date) => void;
  onSelectDay: (dayKey: string) => void;
}) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <Card skin="bordered" className="rounded-lg bg-white p-4 dark:bg-dark-800">
        <div className="mb-3">
          <div className="text-xs font-semibold uppercase text-primary-600 dark:text-primary-400">
            Semanas del mes
          </div>
          <div className="mt-1 text-sm font-medium capitalize text-gray-800 dark:text-dark-50">
            {monthLabel(monthKey)}
          </div>
          <Input
            label="Mes"
            type="month"
            value={monthKey}
            required
            onChange={(event) => {
              if (event.target.value) onSelectMonth(event.target.value);
            }}
            className="mt-3"
          />
        </div>

        <div className="space-y-2">
          {weeks.map((weekStart) => {
            const weekKey = toDayKey(weekStart);
            const days = getWeekDays(weekStart);
            const active = weekKey === selectedWeekStart;
            const count = getNoteCountForWeek(notes, weekStart);

            return (
              <div
                key={weekKey}
                className={clsx(
                  "rounded-lg border p-2 transition",
                  active
                    ? "border-primary-400 bg-primary-50 dark:bg-primary-500/10"
                    : "border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-700/60",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectWeek(weekStart)}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left"
                >
                  <span className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                    {formatShortDate(days[0].getTime())} al {formatShortDate(days[6].getTime())}
                  </span>
                  <Badge color={count > 0 ? "primary" : "neutral"} variant="soft" className="rounded-md px-2 py-1 text-xs">
                    {count}
                  </Badge>
                </button>

                {active && (
                  <div className="mt-2 grid grid-cols-7 gap-1">
                    {days.map((day) => {
                      const dayKey = toDayKey(day);
                      const dayCount = getNoteCountForDay(notes, dayKey);
                      const selected = dayKey === selectedDay;
                      const outsideMonth = toMonthKey(day) !== monthKey;

                      return (
                        <button
                          key={dayKey}
                          type="button"
                          onClick={() => onSelectDay(dayKey)}
                          className={clsx(
                            "rounded-md px-1 py-1.5 text-xs font-semibold transition",
                            selected
                              ? "bg-primary-600 text-white"
                              : "bg-white text-gray-700 hover:bg-primary-50 dark:bg-dark-800 dark:text-dark-100",
                            outsideMonth && "opacity-40",
                          )}
                          title={`${formatShortDate(day.getTime())} - ${dayCount} notas`}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </aside>
  );
}

function CaseWindow({
  note,
  categories,
  tseIndex,
  tseReady,
  windowState,
  onFocus,
  onClose,
  onPatchWindow,
  onUpdate,
  onDelete,
  onToggleCategory,
  onAddCategory,
}: {
  note: CaseNote;
  categories: NoteCategory[];
  tseIndex: TseIndex | null;
  tseReady: boolean;
  windowState: CaseWindowState;
  onFocus: () => void;
  onClose: () => void;
  onPatchWindow: (patch: Partial<CaseWindowState>) => void;
  onUpdate: (patch: Partial<CaseNote>) => void;
  onDelete: () => void;
  onToggleCategory: (categoryId: string) => void;
  onAddCategory: (name: string, color: CategoryColor) => void;
}) {
  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    onFocus();

    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = windowState.x;
    const startTop = windowState.y;

    const move = (moveEvent: PointerEvent) => {
      onPatchWindow({
        x: Math.max(12, Math.min(window.innerWidth - 180, startLeft + moveEvent.clientX - startX)),
        y: Math.max(12, Math.min(window.innerHeight - 80, startTop + moveEvent.clientY - startY)),
      });
    };

    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  const beginResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onFocus();

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = windowState.width;
    const startHeight = windowState.height;

    const move = (moveEvent: PointerEvent) => {
      onPatchWindow({
        width: Math.max(520, Math.min(window.innerWidth - windowState.x - 16, startWidth + moveEvent.clientX - startX)),
        height: Math.max(420, Math.min(window.innerHeight - windowState.y - 16, startHeight + moveEvent.clientY - startY)),
      });
    };

    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  return (
    <div
      className="fixed rounded-lg border border-gray-300 bg-white shadow-2xl shadow-gray-900/20 ring-1 ring-black/5 transition-shadow duration-200 case-window-in dark:border-dark-500 dark:bg-dark-800"
      style={{
        left: windowState.x,
        top: windowState.y,
        width: windowState.width,
        height: windowState.height,
        zIndex: windowState.z,
      }}
      onPointerDown={onFocus}
    >
      <div
        className="flex h-11 cursor-move select-none items-center justify-between gap-3 border-b border-gray-200 bg-gray-100 px-3 dark:border-dark-600 dark:bg-dark-700"
        onPointerDown={beginDrag}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="size-2.5 rounded-full bg-primary-500" />
          <span className="truncate text-sm font-semibold">
            {note.orderNumber ? `Order ${note.orderNumber} · ${note.title}` : note.title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button isIcon variant="flat" className="size-8 rounded-md" onClick={onClose} title="Cerrar ventana">
            X
          </Button>
        </div>
      </div>

      <div className="h-[calc(100%-2.75rem)] overflow-auto bg-gray-50 p-3 dark:bg-dark-900/70">
        <CaseCard
          note={note}
          categories={categories}
          tseIndex={tseIndex}
          tseReady={tseReady}
          isOpen
          onOpen={() => {}}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onToggleCategory={onToggleCategory}
          onAddCategory={onAddCategory}
        />
      </div>

      <div
        className="absolute bottom-0 right-0 size-5 cursor-nwse-resize rounded-br-lg"
        onPointerDown={beginResize}
        title="Redimensionar"
      >
        <div className="absolute bottom-1 right-1 size-3 border-b-2 border-r-2 border-gray-400 dark:border-dark-300" />
      </div>
    </div>
  );
}

function InfoWindow({
  entry,
  windowState,
  onFocus,
  onClose,
  onPatchWindow,
}: {
  entry: SearchEntry;
  windowState: InfoWindowState;
  onFocus: () => void;
  onClose: () => void;
  onPatchWindow: (patch: Partial<InfoWindowState>) => void;
}) {
  const [copied, setCopied] = useState(false);

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    onFocus();

    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = windowState.x;
    const startTop = windowState.y;

    const move = (moveEvent: PointerEvent) => {
      onPatchWindow({
        x: Math.max(12, Math.min(window.innerWidth - 180, startLeft + moveEvent.clientX - startX)),
        y: Math.max(12, Math.min(window.innerHeight - 80, startTop + moveEvent.clientY - startY)),
      });
    };

    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  const beginResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onFocus();

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = windowState.width;
    const startHeight = windowState.height;

    const move = (moveEvent: PointerEvent) => {
      onPatchWindow({
        width: Math.max(420, Math.min(window.innerWidth - windowState.x - 16, startWidth + moveEvent.clientX - startX)),
        height: Math.max(320, Math.min(window.innerHeight - windowState.y - 16, startHeight + moveEvent.clientY - startY)),
      });
    };

    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  const copyEntry = async () => {
    await navigator.clipboard.writeText(entry.body);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div
      className="fixed rounded-lg border border-gray-300 bg-white shadow-2xl shadow-gray-900/20 ring-1 ring-black/5 case-window-in dark:border-dark-500 dark:bg-dark-800"
      style={{
        left: windowState.x,
        top: windowState.y,
        width: windowState.width,
        height: windowState.height,
        zIndex: windowState.z,
      }}
      onPointerDown={onFocus}
    >
      <div
        className="flex h-11 cursor-move select-none items-center justify-between gap-3 border-b border-gray-200 bg-gray-100 px-3 dark:border-dark-600 dark:bg-dark-700"
        onPointerDown={beginDrag}
      >
        <div className="flex min-w-0 items-center gap-2">
          <FaLightbulb className="shrink-0 text-warning" />
          <span className="truncate text-sm font-semibold">{entry.title}</span>
        </div>
        <Button isIcon variant="flat" className="size-8 rounded-md" onClick={onClose} title="Cerrar ventana">
          X
        </Button>
      </div>

      <div className="h-[calc(100%-2.75rem)] overflow-auto bg-gray-50 p-5 dark:bg-dark-900/70">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge color="info" variant="soft" className="rounded-md px-2 py-1">
              {entry.category}
            </Badge>
            <h2 className="mt-3 text-lg font-semibold text-gray-950 dark:text-white">
              {entry.title}
            </h2>
          </div>
          <Button color="primary" variant="soft" className="h-9 gap-2 rounded-md px-3" onClick={copyEntry}>
            <FaCopy />
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
        <div className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-4 text-sm leading-6 text-gray-700 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100">
          {entry.body}
        </div>
      </div>

      <div
        className="absolute bottom-0 right-0 size-5 cursor-nwse-resize rounded-br-lg"
        onPointerDown={beginResize}
        title="Redimensionar"
      >
        <div className="absolute bottom-1 right-1 size-3 border-b-2 border-r-2 border-gray-400 dark:border-dark-300" />
      </div>
    </div>
  );
}

function CaseCard({
  note,
  categories,
  tseIndex,
  tseReady,
  isOpen,
  onOpen,
  onUpdate,
  onDelete,
  onToggleCategory,
  onAddCategory,
}: {
  note: CaseNote;
  categories: NoteCategory[];
  tseIndex: TseIndex | null;
  tseReady: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onUpdate: (patch: Partial<CaseNote>) => void;
  onDelete: () => void;
  onToggleCategory: (categoryId: string) => void;
  onAddCategory: (name: string, color: CategoryColor) => void;
}) {
  const tipification = useMemo(() => inferTipification(note), [note]);
  const selectedCategories = getSelectedCategories(note, categories);
  const accentCategory = selectedCategories[0];
  const generatedNote = note.generatedNote || buildGeneratedNote(note);
  const tseMatch = useMemo(() => findTseName(note.cedula, tseIndex), [note.cedula, tseIndex]);
  const cedulaDigits = note.cedula.replace(/\D/g, "");
  const showTseNotFound = tseReady && cedulaDigits.length > 0 && !tseMatch;

  useEffect(() => {
    if (tseMatch && !note.customerName.trim()) {
      onUpdate({ customerName: tseMatch });
    }
  }, [note.customerName, onUpdate, tseMatch]);

  const updateCedula = (value: string) => {
    const match = findTseName(value, tseIndex);
    onUpdate(match ? { cedula: value, customerName: match } : { cedula: value });
  };

  const updateProducts = (products: CaseProduct[]) => {
    onUpdate({
      products,
      skuList: products.map((product) => buildProductLine(product)).join("\n"),
    });
  };

  return (
    <Card
      skin="bordered"
      className={clsx(
        "overflow-hidden rounded-lg border-l-4 bg-white transition-colors hover:bg-gray-50 dark:bg-dark-800 dark:hover:bg-dark-700 cursor-pointer",
        categoryAccentClass(),
      )}
      style={categoryAccentStyle(accentCategory?.color)}
      onClick={onOpen}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            className="min-w-0 text-left rounded-md"
            onClick={onOpen}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary-50 text-primary-600 dark:bg-primary-500/10">
                <FaRegStickyNote />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-base font-semibold text-gray-950 dark:text-white">
                  {note.orderNumber ? `Order ${note.orderNumber} - ${note.title}` : note.title}
                </span>
                <span className="mt-0.5 block truncate text-xs text-gray-500 dark:text-dark-300">
                  {note.customerName || "Sin cliente"} - {formatDateTime(note.createdAt)} - actualizado {formatAgo(note.updatedAt)}
                </span>
              </span>
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <Button isIcon variant="flat" className="size-8 rounded-md" onClick={(event) => event.stopPropagation() || onOpen()} title="Abrir caso">
              <FaEye className={clsx("transition", isOpen && "rotate-180")} />
            </Button>
            <Button isIcon color="error" variant="flat" className="size-8 rounded-md" onClick={(event) => { event.stopPropagation(); onDelete(); }} title="Finalizar caso">
              <FaTrash />
            </Button>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2.5">
          <StatusBadge icon={<FaLightbulb />} label={`${tipification.code} - ${tipification.label}`} color="info" />
          {selectedCategories.length === 0 ? (
            <StatusBadge icon={<FaCheck />} label="Sin categoria" color="neutral" />
          ) : (
            selectedCategories.map((category) => (
              <span
                key={category.id}
                style={categoryChipStyle(category.color)}
                className={clsx(
                  "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium",
                  categoryClasses(category.color),
                )}
              >
                {category.name}
              </span>
            ))
          )}
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-gray-200 bg-gray-50 p-5 dark:border-dark-600 dark:bg-dark-900/45 sm:p-6">
          <div className="space-y-5">
            <Section title="Nota del caso" defaultOpen>
              <div className="grid gap-4 lg:grid-cols-2">
                <Input label="Titulo" value={note.title} onChange={(event) => onUpdate({ title: event.target.value })} />
                <Input label="Numero de Order" value={note.orderNumber} onChange={(event) => onUpdate({ orderNumber: event.target.value })} />
                <div>
                  <Input label="Cliente" value={note.customerName} onChange={(event) => onUpdate({ customerName: event.target.value })} />
                  {showTseNotFound && (
                    <p className="mt-1 text-xs text-warning-darker dark:text-warning-lighter">
                      No se encontro coincidencia. Buscar en el sitio de TSE.
                    </p>
                  )}
                  {tseMatch && (
                    <p className="mt-1 text-xs text-success-darker dark:text-success-lighter">
                      Coincidencia TSE: {tseMatch}
                    </p>
                  )}
                </div>
                <div>
                  <Input label="Cedula" value={note.cedula} onChange={(event) => updateCedula(event.target.value)} />
                  <CedulaVariants value={note.cedula} />
                </div>
                <Input label="Telefono" value={note.phone} onChange={(event) => onUpdate({ phone: event.target.value })} />
                <Input label="Correo" value={note.email} onChange={(event) => onUpdate({ email: event.target.value })} />
                <Input label="Metodo de pago" value={note.total} onChange={(event) => onUpdate({ total: event.target.value })} prefix={<FaMoneyBillWave className="size-4" />} />
                <ProductsEditor
                  products={note.products.length > 0 ? note.products : normalizeProducts(note)}
                  onChange={updateProducts}
                />
                <QuickCategorySelector
                  note={note}
                  categories={categories}
                  onToggleCategory={onToggleCategory}
                />
                <GeneratedNote value={generatedNote} onChange={(value) => onUpdate({ generatedNote: value })} />
                <Textarea
                  label="Nota libre"
                  value={note.freeNote}
                  onChange={(event) => onUpdate({ freeNote: event.target.value })}
                  rootProps={{ className: "sm:col-span-2" }}
                  className="min-h-32 resize-y"
                  placeholder="Lo que no quieres olvidar de la llamada..."
                />
                <TipificationHint tipification={tipification} />
                <CategoryPanel
                  note={note}
                  categories={categories}
                  selectedCategories={selectedCategories}
                  onToggleCategory={onToggleCategory}
                  onAddCategory={onAddCategory}
                />
              </div>
            </Section>
          </div>
        </div>
      )}
    </Card>
  );
}
function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-gray-200 bg-white p-4 dark:border-dark-600 dark:bg-dark-800 sm:p-5"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
        {title}
        <FaChevronDown className="transition group-open:rotate-180" />
      </summary>
      <div className="mt-5">{children}</div>
    </details>
  );
}

function CedulaVariants({ value }: { value: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const variants = getCedulaVariants(value);

  if (!variants.length) return null;

  const copyVariant = async (variant: string) => {
    try {
      await navigator.clipboard.writeText(variant);
      setCopied(variant);
      window.setTimeout(() => setCopied(null), 1200);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-dark-600 dark:bg-dark-700">
      <div className="mb-2 text-xs font-semibold text-gray-500 dark:text-dark-200">
        Variantes para copiar
      </div>
      <div className="flex flex-wrap gap-2">
        {variants.map((item) => (
          <button
            key={`${item.label}-${item.value}`}
            type="button"
            title={`Copiar ${item.value}`}
            onClick={() => void copyVariant(item.value)}
            className="rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-left text-xs font-medium text-gray-700 transition hover:border-primary-400 hover:text-primary-700 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100"
          >
            <span className="block text-[11px] font-semibold uppercase text-gray-400 dark:text-dark-300">
              {item.label}
            </span>
            <span className="font-mono">{item.value}</span>
            {copied === item.value && <span className="ml-2 text-success">Copiado</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductsEditor({
  products,
  onChange,
}: {
  products: CaseProduct[];
  onChange: (products: CaseProduct[]) => void;
}) {
  const [defaultProduct] = useState(() => ({
    id: crypto.randomUUID(),
    code: "",
    needsTransfer: false,
  }));

  const productList = products.length > 0 ? products : [defaultProduct];

  const updateProduct = (id: string, patch: Partial<CaseProduct>) => {
    onChange(productList.map((product) => (product.id === id ? { ...product, ...patch } : product)));
  };

  const addProduct = () => {
    onChange([...productList, { id: crypto.randomUUID(), code: "", needsTransfer: false }]);
  };

  const removeProduct = (id: string) => {
    const next = productList.filter((product) => product.id !== id);
    onChange(next.length > 0 ? next : [{ id: crypto.randomUUID(), code: "", needsTransfer: false }]);
  };

  return (
    <div className="sm:col-span-2">
      <div className="mb-2 text-sm font-medium text-gray-700 dark:text-dark-100">
        Productos / codigos
      </div>
      <div className="space-y-2">
        {productList.map((product, index) => (
          <div
            key={product.id}
            className="grid gap-2 rounded-lg border border-gray-200 bg-white p-2 dark:border-dark-600 dark:bg-dark-800 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
          >
            <Input
              value={product.code}
              onChange={(event) => updateProduct(product.id, { code: event.target.value })}
              placeholder={`Codigo de producto ${index + 1}`}
              aria-label={`Codigo de producto ${index + 1}`}
            />
            <label className="flex h-10 items-center gap-2 rounded-md border border-gray-200 px-3 text-sm font-medium text-gray-700 dark:border-dark-500 dark:text-dark-100">
              <input
                type="checkbox"
                checked={product.needsTransfer}
                onChange={(event) => updateProduct(product.id, { needsTransfer: event.target.checked })}
                className="size-4"
              />
              Translado
            </label>
            <Button
              isIcon
              color="error"
              variant="flat"
              className="size-10 rounded-md"
              onClick={() => removeProduct(product.id)}
              title="Eliminar producto"
            >
              <FaTrash />
            </Button>
          </div>
        ))}
      </div>
      <Button color="primary" variant="soft" className="mt-3 h-9 gap-2 rounded-md px-3" onClick={addProduct}>
        <FaPlus />
        Agregar producto
      </Button>
    </div>
  );
}

function GeneratedNote({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [copied, setCopied] = useState(false);

  const copyNote = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="sm:col-span-2">
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-gray-700 dark:text-dark-100">Nota generada</label>
        <Button
          color="primary"
          variant="soft"
          className="h-8 shrink-0 gap-2 rounded-md px-3 text-xs"
          onClick={() => void copyNote()}
        >
          <FaCopy />
          {copied ? "Copiado" : "Copiar nota"}
        </Button>
      </div>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-44 font-mono text-sm leading-6"
        aria-label="Nota generada"
      />
    </div>
  );
}

function QuickCategorySelector({
  note,
  categories,
  onToggleCategory,
}: {
  note: CaseNote;
  categories: NoteCategory[];
  onToggleCategory: (categoryId: string) => void;
}) {
  return (
    <div className="sm:col-span-2">
      <div className="mb-2 text-sm font-semibold text-gray-800 dark:text-dark-50">Seleccionar categoría</div>
      <div className="flex flex-wrap gap-2">
        {categories.length > 0 ? (
          categories.map((category) => {
            const selected = note.categoryIds.includes(category.id);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onToggleCategory(category.id)}
                style={categoryChipStyle(category.color, selected)}
                className={clsx(
                  "rounded-md border px-3 py-2 text-left text-sm font-medium transition hover:shadow-sm",
                  categoryClasses(category.color, selected),
                  !selected && "opacity-80 hover:opacity-100",
                )}
              >
                {category.name}
              </button>
            );
          })
        ) : (
          <span className="text-sm text-gray-500 dark:text-dark-300">No hay categorías rápidas disponibles.</span>
        )}
      </div>
    </div>
  );
}

function TipificationHint({ tipification }: { tipification: Tipification }) {
  return (
    <div className="rounded-lg border border-info/25 bg-info/5 p-3 dark:bg-info/10 sm:col-span-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase text-info-darker dark:text-info-lighter">
            Tipificacion sugerida
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <Badge color="info" variant="soft" className="rounded-md px-2 py-1 font-mono">
              {tipification.code}
            </Badge>
            <span className="font-medium text-gray-800 dark:text-dark-50">{tipification.label}</span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-dark-200">
        Se detecta solo con productos, nota, pago, order, factura, garantia, stock, traslado y palabras clave.
      </p>
    </div>
  );
}

function CategoryPanel({
  note,
  categories,
  selectedCategories,
  onToggleCategory,
  onAddCategory,
}: {
  note: CaseNote;
  categories: NoteCategory[];
  selectedCategories: NoteCategory[];
  onToggleCategory: (categoryId: string) => void;
  onAddCategory: (name: string, color: CategoryColor) => void;
}) {
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<CategoryColor>("#0ea5e9");
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  // push 20:39 pm
  const addCategory = () => {
    onAddCategory(newName, newColor);
    setNewName("");
    setQuery("");
  };

  return (
    <div className="sm:col-span-2">
      <Section title="Categoria de la nota" defaultOpen={false}>
      <div className="space-y-5">
        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-dark-600 dark:bg-dark-800">
          <div className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-dark-300">
            Asignadas
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.length === 0 ? (
              <span className="text-sm text-gray-500 dark:text-dark-300">Ninguna aun</span>
            ) : (
              selectedCategories.map((category) => (
                <span
                  key={category.id}
                  style={categoryChipStyle(category.color)}
                  className={clsx(
                    "inline-flex rounded-md border px-2.5 py-1 text-xs font-medium",
                    categoryClasses(category.color),
                  )}
                >
                  {category.name}
                </span>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm font-semibold text-gray-800 dark:text-dark-50">
            Categorias rapidas
          </div>
          <div className="flex flex-wrap gap-2">
            {filteredCategories.map((category) => {
              const selected = note.categoryIds.includes(category.id);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => onToggleCategory(category.id)}
                  style={categoryChipStyle(category.color, selected)}
                  className={clsx(
                    "rounded-md border px-3 py-2 text-left text-sm font-medium transition hover:shadow-sm",
                    categoryClasses(category.color, selected),
                    !selected && "opacity-80 hover:opacity-100",
                  )}
                >
                  {category.name}
                </button>
              );
            })}
            {filteredCategories.length === 0 && (
              <div className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 dark:border-dark-500 dark:text-dark-300">
                No hay categorias con ese nombre.
              </div>
            )}
          </div>
        </div>

        <Input
          label="Buscar categoria"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          prefix={<FaSearch className="size-4" />}
          placeholder="Filtrar si hay muchas categorias..."
        />

        <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-dark-600 dark:bg-dark-800">
          <div className="text-sm font-semibold text-gray-800 dark:text-dark-50">Nueva categoria</div>
          <div className="mt-3 space-y-3">
            <Input
              label="Nombre"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Ej. Pedido con reclamo"
            />
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-100">
              Color
              <input
                type="color"
                value={normalizeColor(newColor)}
                onChange={(event) => setNewColor(event.target.value)}
                className="mt-1 h-10 w-full cursor-pointer rounded-md border border-gray-200 bg-white p-1 dark:border-dark-500 dark:bg-dark-700"
              />
            </label>
            <Button color="primary" className="h-10 w-full gap-2 rounded-md px-3" onClick={addCategory}>
              <FaPlus />
              Agregar
            </Button>
          </div>
        </div>
      </div>
      </Section>
    </div>
  );
}

function StatusBadge({
  icon,
  label,
  color,
}: {
  icon: ReactNode;
  label: string;
  color: "neutral" | "info" | "success" | "warning" | "error";
}) {
  return (
    <Badge color={color} variant="soft" className="gap-1.5 rounded-md px-2.5 py-1 text-xs">
      {icon}
      {label}
    </Badge>
  );
}

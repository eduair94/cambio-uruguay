// Importación y aduana: la guía del "impuesto Temu", el nombre con el que la prensa bautizó al IVA
// de las compras web del exterior desde el Decreto 50/026.
//
// Las cifras (US$ 800 en tres envíos, IVA 22 %, el piso de US$ 20 por envío, la exoneración de
// US$ 200 del acuerdo con Estados Unidos y el registro de vendedores del 1.º de octubre de 2026)
// están alineadas a mano con `utils/aduanaFaq.ts` y `pages/franquicia-aduana-uruguay.vue`, que son
// la fuente de verdad del sitio para este régimen: si alguna cambia ahí, cambia acá.
//
// Lo que NO es un número verificado va dicho con su incertidumbre a la vista: los plazos de entrega
// de BFE Express (testimonios, no plazo publicado) y las cifras de recaudación y caída de compras
// (prensa fechada, sin serie oficial reproducible).
import type { Guide } from './guides'

export const importacionGuides: readonly Guide[] = [
  {
    slug: 'impuesto-temu-uruguay',
    title: 'Impuesto Temu: qué es y cuánto pagás',
    description:
      'Desde el 1.º de mayo de 2026 tus compras web del exterior pagan IVA 22 %, con franquicia de US$ 800 en tres envíos. Cuánto pagás, cuándo no y quién te lo cobra.',
    tag: 'ADUANA',
    updatedAt: '2026-09-15',
    sections: [
      {
        heading: 'Qué es el impuesto Temu y desde cuándo rige',
        body: '"Impuesto Temu" es un nombre de prensa, no una figura legal: con esas palabras no aparece en ninguna norma. Lo que cambió es el régimen de envíos postales internacionales, que reescribió el Decreto 50/026 y que rige desde el 1.º de mayo de 2026. Desde esa fecha, la compra que hacés en una tienda web del exterior y entra al país como envío postal paga IVA a la tasa básica del 22 % sobre el valor de factura, salvo las excepciones oficiales. El decreto separó dos cosas que antes venían juntas: la franquicia te exonera de aranceles, pero no del IVA. Por eso una compra que entra con franquicia igual puede llegarte con una liquidación para pagar antes de que te entreguen el paquete. Se le dice impuesto Temu porque Temu es la plataforma que lo hizo visible, pero la regla no mira la tienda: mira el origen del envío, el valor y el régimen por el que entra.',
      },
      {
        heading: 'Cuánto pagás: tres ejemplos',
        body: 'La cuenta arranca en el valor de factura, no en lo que te quedó por pagar después de los cupones. Sobre ese valor va el 22 %, y hay un piso: el IVA de un envío postal no baja del equivalente a US$ 20 por envío, salvo que el paquete lleve sólo bienes exonerados. Ese mínimo muerde en toda compra de menos de US$ 90,91, que es donde el 22 % da menos de US$ 20. Aviso honesto: ni la guía del MEF ni las preguntas frecuentes de la Aduana nombran ese piso al explicar la franquicia, así que pedile al operador la liquidación discriminada. Y el cupo manda: si en el año ya usaste los tres envíos o los US$ 800, esa compra sale de la franquicia y pasa a la prestación única del 60 % mientras el envío no supere US$ 800 ni 20 kg, o al régimen general con despachante si los supera. Para el número final con flete y cargos incluidos está la calculadora de impuestos de importación.',
        table: {
          headers: ['Compra', 'Origen', 'Qué pagás'],
          rows: [
            [
              'Paquete de US$ 19',
              'China',
              'El 22 % da US$ 4,18, pero se cobra el mínimo de US$ 20 de IVA por envío, más los cargos del operador',
            ],
            [
              'Compra de US$ 150',
              'China',
              'US$ 33 de IVA (22 % del valor de factura); te consume un envío y US$ 150 del cupo anual',
            ],
            [
              'Compra de US$ 150',
              'EE.UU.',
              'Sin IVA por el acuerdo con Estados Unidos, que exonera envíos de hasta US$ 200; igual te consume un envío y US$ 150 del cupo',
            ],
          ],
        },
        links: [
          {
            label: 'Calculadora de impuestos de importación',
            to: '/herramientas/calculadora-impuestos-importacion',
          },
        ],
      },
      {
        heading: 'Cuándo no pagás',
        body: 'Hay dos puertas de salida y las dos son estrechas. La primera: los envíos procedentes de Estados Unidos de hasta US$ 200 por envío, que la Aduana exonera de IVA por el acuerdo comercial vigente con ese país. Ojo con la fecha, porque cambia el resultado: desde el 1.º de octubre de 2026, salvo nueva prórroga, la exoneración además exige que el vendedor que emite la factura esté registrado ante la Aduana, y si no figura en la lista oficial el envío paga. La segunda puerta: los obsequios familiares genuinos, de persona física a persona física, en cantidades razonables y para uso personal, con declaración de valor. Escribir "regalo" sobre una compra comercial no la convierte en obsequio. Y acá está el detalle que descoloca a todo el mundo: no pagar no es no consumir. Un envío exonerado igual te gasta uno de los tres del año y su valor se descuenta del cupo, así que si traés US$ 198 de Estados Unidos sin IVA te quedan US$ 602 y dos envíos.',
      },
      {
        heading: 'La franquicia nueva: US$ 800 en tres envíos',
        body: 'La franquicia es personal y tiene requisitos duros: persona física mayor de edad con documento de identidad uruguayo, envío de uso personal y sin fines comerciales, hasta 20 kg, y comprador, titular del medio de pago y destinatario tienen que ser la misma persona. El cupo es de US$ 800 acumulados por año civil, en hasta tres envíos. No es US$ 800 por envío: cada compra consume su valor y uno de los tres usos, por chica que sea. Antes del 1.º de mayo de 2026 el esquema estaba peor repartido, con tres envíos de hasta US$ 200 cada uno y un corte de US$ 50 si el paquete venía por correo no exprés; ese tope por envío quedó derogado. El cupo tampoco se presta ni se regala: usar la cédula de un familiar contradice la titularidad y el uso personal que exige el Decreto 50/026. El operador postal informa cada envío a la Aduana, así que el conteo no lo llevás vos solo.',
        links: [
          { label: 'Franquicia de aduana: los topes de hoy', to: '/franquicia-aduana-uruguay' },
        ],
      },
      {
        heading: 'Cómo y cuándo se cobra',
        body: 'Temu, Shein y AliExpress no te cobran este impuesto en el carrito: ahí pagás la mercadería y el envío, nada más. El Decreto 50/026 pone la liquidación y el pago en cabeza del operador postal que desconsolida el envío, el Correo Uruguayo o el courier, y le prohíbe entregarte la mercadería hasta haber acreditado ese pago ante la Aduana. En la práctica el paquete llega, te avisan que hay una liquidación, pagás y recién ahí te lo entregan. No lo confundas con el depósito de impuestos que Amazon sí cobra en el checkout: es otro mecanismo. Dos precauciones antes de apretar comprar. Pagá con una tarjeta a tu nombre, porque para usar la franquicia el comprador, el titular del medio de pago y el destinatario tienen que coincidir. Y guardá la factura con el valor real, porque ese es el número que mira la Aduana y el que vas a necesitar si te liquidan de más.',
        links: [
          {
            label: 'Cómo declarar una compra del exterior',
            to: '/declarar-compra-exterior-uruguay',
          },
        ],
      },
      {
        heading: 'BFE Express: quién te entrega el pedido de Temu',
        body: 'BFE Express es el operador logístico que aparece en el seguimiento de los pedidos de Temu con destino Uruguay. No es la Aduana ni el Correo: es el eslabón que mueve el paquete, y su número de seguimiento lo podés consultar desde la app de Temu o pegarlo en un rastreador como 17track para ver dónde está. Los plazos son la parte incómoda: no localizamos un plazo de entrega publicado por BFE Express para Uruguay, y en redes y foros uruguayos se reportan demoras de más de un mes. Tratalo como lo que es, testimonios de compradores, no una cifra oficial. Si ya pasó la fecha estimada, Temu ofrece dos salidas desde "Devolución/otra ayuda" en el pedido: reembolso por artículo no recibido y crédito por entrega tardía. Y si el seguimiento se quedó quieto porque el paquete está retenido, el problema dejó de ser logístico y pasó a ser aduanero.',
        links: [
          {
            label: 'Qué hacer si tenés problemas con la Aduana',
            to: '/problemas-con-la-aduana-uruguay',
          },
          { label: 'Dónde te entregan el paquete', to: '/donde-te-entregan-el-paquete-uruguay' },
        ],
      },
      {
        heading: 'Shein y AliExpress pagan lo mismo',
        body: 'No existe un impuesto de Temu ni uno de Shein: la regla es del régimen postal y no mira el logo de la tienda. Una compra de US$ 60 en Temu, en Shein, en AliExpress o en cualquier tienda china paga el mismo 22 %, con el mismo piso de US$ 20 por envío y consumiendo el mismo cupo anual. Lo que sí cambia el resultado es el origen: si comprás en Estados Unidos y el envío no pasa de US$ 200, hoy no pagás IVA, y eso mueve la comparación de precios bastante más que cualquier descuento de plataforma. Antes de decidir por el precio de vidriera, sumale a cada opción el IVA, el mínimo por envío y los cargos del operador: una diferencia de US$ 10 en el carrito se da vuelta con facilidad. Y mirá también qué comprás, porque hay mercadería que directamente no entra por este régimen.',
        links: [
          {
            label: 'Comprar en Amazon desde Uruguay',
            to: '/guias/comprar-en-amazon-desde-uruguay',
          },
          { label: 'Importar de AliExpress', to: '/guias/importar-de-aliexpress-a-uruguay' },
        ],
      },
      {
        heading: 'Qué pasó con las compras',
        body: 'El régimen ya dejó números, y no son los que se esperaban de ninguno de los dos lados. El Observador publicó el 28 de julio de 2026 que el propio Gobierno estimó la recaudación del nuevo esquema, y El País publicó el 20 de agosto de 2026 que las compras web al exterior cayeron por tercer mes consecutivo frente al mismo período de 2025. Leelo con la advertencia que corresponde: son cifras de prensa y no localizamos una serie oficial publicada que permita reproducirlas, así que lo que se sostiene es la dirección, no el decimal. Y la dirección dice algo bastante claro: una franquicia más grande no compensó la aparición del IVA. Para quien compra, la conclusión práctica es corta. El cupo rinde en las compras grandes, donde el 22 % se reparte sobre más plata, y no en los paquetes de US$ 15, donde el mínimo por envío se come cualquier diferencia de precio.',
      },
    ],
    faqs: [
      {
        q: '¿Temu cobra el impuesto al comprar?',
        a: 'No. En el carrito de Temu pagás la mercadería y el envío. El IVA lo liquida el operador postal o el courier que desconsolida el paquete, y te lo cobra antes de entregártelo. Por eso mucha gente se entera del importe con el aviso de llegada y no en el momento de pagar la compra.',
      },
      {
        q: '¿Cuánto es el impuesto Temu?',
        a: 'Es el IVA a la tasa básica: 22 % sobre el valor de factura del envío. Tiene un piso propio, porque el IVA de un envío postal no baja del equivalente a US$ 20, salvo que el paquete lleve sólo bienes exonerados. En compras de menos de US$ 90,91 vas a terminar pagando ese mínimo.',
      },
      {
        q: '¿Qué es BFE Express?',
        a: 'Es el operador logístico que figura en el seguimiento de los pedidos de Temu hacia Uruguay. No cobra impuestos ni resuelve la aduana: transporta. El número de seguimiento se consulta en la app de Temu o en rastreadores como 17track. No localizamos un plazo de entrega publicado por la empresa para Uruguay.',
      },
      {
        q: '¿Cuántas compras puedo hacer por año?',
        a: 'Con franquicia, hasta tres envíos por año civil, y la suma de sus valores de factura no puede pasar de US$ 800. Cada envío consume un uso aunque sea chico y aunque esté exonerado de IVA. Agotado el cupo podés seguir comprando, pero por otro régimen y con otra cuenta.',
      },
      {
        q: '¿Shein también paga?',
        a: 'Sí, igual que Temu, AliExpress o cualquier tienda web del exterior. El régimen postal no distingue plataformas: mira el origen del envío, el valor de factura y si usás o no la franquicia. Con un envío desde China el resultado es IVA del 22 %, con el mínimo de US$ 20 por envío.',
      },
      {
        q: '¿Conviene comprar en EE.UU.?',
        a: 'Para valores bajos, muchas veces sí: los envíos procedentes de Estados Unidos de hasta US$ 200 por envío están exonerados de IVA. Pero desde el 1.º de octubre de 2026, salvo nueva prórroga, el vendedor que factura tiene que estar registrado ante la Aduana, y el envío igual te consume uno de los tres del año.',
      },
    ],
    related: [
      { label: 'Franquicia de aduana', to: '/franquicia-aduana-uruguay' },
      { label: 'Importar de AliExpress', to: '/guias/importar-de-aliexpress-a-uruguay' },
      { label: 'Comprar en Amazon desde Uruguay', to: '/guias/comprar-en-amazon-desde-uruguay' },
      { label: 'Problemas con la Aduana', to: '/problemas-con-la-aduana-uruguay' },
      { label: 'Dónde te entregan el paquete', to: '/donde-te-entregan-el-paquete-uruguay' },
      { label: 'Declarar una compra del exterior', to: '/declarar-compra-exterior-uruguay' },
    ],
    sources: [
      {
        label:
          'Decreto 50/026 — régimen de envíos postales internacionales vigente desde mayo de 2026',
        url: 'https://www.impo.com.uy/bases/decretos-originales/50-2026',
        publisher: 'IMPO',
      },
      {
        label:
          'Desde el 1.º de mayo comienza a regir el nuevo régimen de franquicias de envíos postales internacionales',
        url: 'https://www.aduanas.gub.uy/innovaportal/v/28455/1/innova.front/desde-el-1%C2%BA-de-mayo-comienza-a-regir-el-nuevo-regimen-de-franquicias-de-envios-postales-internacionales.html',
        publisher: 'Dirección Nacional de Aduanas',
      },
      {
        label: 'Comenzó a regir el "impuesto Temu": cuáles son las claves',
        url: 'https://www.ambito.com/uruguay/comenzo-regir-el-impuesto-temu-cuales-son-las-claves-n6273075',
        publisher: 'Ámbito',
      },
      {
        label:
          'Desde mayo rige el "impuesto Temu": las compras web del exterior pagan IVA y cambian las franquicias',
        url: 'https://www.telenoche.com.uy/nacionales/desde-mayo-rige-el-impuesto-temu-compras-web-del-exterior-pagaran-iva-y-cambian-las-franquicias-n5394059',
        publisher: 'Telenoche',
      },
      {
        label: 'BFE Express — seguimiento de envíos',
        url: 'https://www.17track.net/en/carriers/bfe',
        publisher: '17track',
      },
    ],
  },
]

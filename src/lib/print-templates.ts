import { toCanvas } from 'bwip-js/browser'
import type { BagTag, BoardingPass } from '@/services'
import { escapeHtml as e } from './print'

/*
| Print documents — same designs as the legacy DCS (flightmodev2 resources/views/dcs/BP.blade.php and
| bagtag.blade.php). Each function returns a complete HTML document: QZ Tray prints it as-is on the
| thermal printer, the browser fallback prints the same document.
| Barcodes are PNG data URLs (like legacy) — thermal printer HTML renderers handle them reliably.
*/

function barcodePng(options: Parameters<typeof toCanvas>[1]) {
  const canvas = document.createElement('canvas')
  toCanvas(canvas, options)
  return canvas.toDataURL('image/png')
}

/** CODE128 of the 10-digit bag tag number */
export const code128Png = (text: string) =>
  barcodePng({ bcid: 'code128', text, scale: 3, height: 12, includetext: false })

/** QR of the IATA BCBP string (legacy pass used a QR code) */
export const qrPng = (text: string) => barcodePng({ bcid: 'qrcode', text, scale: 4 })

const SEAT_POSITION: Record<string, string> = { window: 'WINDOW', aisle: 'AISLE', middle: 'MIDDLE' }

const logo = (url: string | null | undefined, name: string, className: string) =>
  url ? `<img src="${e(url)}" alt="" class="${className}">` : `<div class="${className} logo-text">${e(name)}</div>`

const PLANE_SVG =
  '<svg width="20" height="20" viewBox="0 0 24 24"><path fill="#000" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z"/></svg>'

// ─── Boarding pass: 80 mm receipt (legacy "Printer POS-80") ───

const BOARDING_PASS_CSS = `
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: "Roboto Condensed", "Arial Narrow", Arial, sans-serif; }
  body { margin: 0; padding: 0; width: 80mm; background: #fff; color: #000; }
  .ticket { width: 80mm; padding: 6mm 5mm; }
  .logo { display: flex; align-items: center; justify-content: center; }
  .logo img { width: 135px; }
  .logo-text { font-size: 18px; font-weight: 700; text-align: center; }
  .title { background: #000; color: #fff; font-weight: 700; text-align: center; padding: 2mm 0; font-size: 14px; margin: 2mm 0 4mm 0; letter-spacing: 1px; }
  .label { font-size: 9px; color: #555; margin-bottom: 1mm; }
  .value { font-size: 16px; font-weight: 500; letter-spacing: 0.5px; }
  .row { margin-bottom: 3mm; }
  .divider { border-top: 1px dashed #000; margin: 3mm 0; }
  .route { display: flex; justify-content: space-between; align-items: center; font-size: 42px; }
  .route small { display: block; font-size: 12px; color: #555; text-align: center; padding-bottom: 10px; }
  .route .pl { position: relative; top: -15px; }
  .flex { display: flex; justify-content: space-between; gap: 3mm; }
  .box { flex: 1; text-align: center; }
  .qr { width: 100%; text-align: center; margin: 4mm 0; }
  .qr img { width: 45mm; height: 45mm; }
  .bags { padding: 5px 0 10px 0; }
  .bags div { padding-bottom: 5px; font-size: 11px; }
  .blackbar { background: #000; color: #fff; font-size: 10px; text-align: center; padding: 2mm; font-weight: 700; margin-top: 3mm; }
  .notice { font-size: 8px; text-align: center; margin-top: 2mm; line-height: 1.4; }
  .footer { font-size: 7px; text-align: center; margin-top: 3mm; color: #333; }
`

export function boardingPassDocument(p: BoardingPass) {
  const box = (label: string, value: unknown, extra = '') =>
    `<div class="box"><div class="label">${e(label)}</div><div class="value">${e(value || '-')}</div>${extra}</div>`
  const position = p.seat_type ? SEAT_POSITION[p.seat_type] : null
  const printed = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return `<!doctype html><html><head><meta charset="utf-8"><title>Boarding pass ${e(p.flight_number)} ${e(p.seat_number)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;500;700&display=swap">
<style>${BOARDING_PASS_CSS}</style></head><body>
<div class="ticket">
  <div class="logo">${logo(p.airline.logo_url, p.airline.name, 'logo-img')}</div>
  <div class="title">BOARDING PASS</div>

  <div class="row">
    <div class="label">PASSENGER</div>
    <div class="value">${e(p.passenger.name)} /${e(p.passenger.type)}</div>
    ${p.infant ? `<div class="value">${e(p.infant.name)} /INF</div>` : ''}
  </div>

  <div class="divider"></div>
  <div class="route">
    <div>${e(p.origin.code)}<small>${e(p.origin.city)}</small></div>
    <div class="pl">${PLANE_SVG}</div>
    <div>${e(p.destination.code)}<small>${e(p.destination.city)}</small></div>
  </div>

  <div class="divider"></div>
  <div class="flex">
    ${box('FLIGHT', p.flight_number)}
    ${box('CABIN', p.cabin_class)}
    ${box('DATE', p.departure_date.replace(/-/g, '.'))}
  </div>

  <div class="divider"></div>
  <div class="flex">
    ${box('SEAT', p.seat_number, position ? `<div style="font-size:9px;">${position}</div>` : '')}
    ${box('GATE', p.gate)}
    ${box('BOARDING', p.boarding_time)}
  </div>

  <div class="divider"></div>
  <div class="flex">
    ${box('PNR', p.pnr)}
    ${box('ZONE', p.zone)}
    ${box('TERMINAL', p.terminal)}
  </div>

  <div class="qr">
    <img src="${qrPng(p.barcode)}" alt="">
    <p class="label">SEQ:${e(p.boarding_sequence ?? '-')}</p>
  </div>
  <div class="bags">
    ${p.bag_tags.map((tag, i) => `<div>BAG #${String(i + 1).padStart(2, '0')}: <strong>${e(tag)}</strong></div>`).join('')}
  </div>

  <div class="blackbar">PLEASE BE AT THE GATE ON TIME</div>
  <div class="notice">
    BOARDING GATE CLOSES 15 MINUTES BEFORE DEPARTURE.<br/>
    CHECK YOUR GATE FOR UPDATES.<br/>
    THANK YOU FOR NOT SMOKING.
  </div>
  <div class="footer">Printed: ${e(printed)}</div>
</div>
</body></html>`
}

// ─── Bag tag: 51 mm strip (legacy "PrinterBagTag" / "BTP") ───

const BAG_TAG_CSS = `
  @page { size: 51mm auto; margin: 0; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0 0 0 6px; background: #fff; color: #000; font-family: Helvetica, Arial, sans-serif; }
  hr { border: 0; height: 0.5px; background-color: #000; margin: 0; }
  img { width: 100%; height: auto; }
  .logo-img { filter: grayscale(100%); }
  .logo-text { font-size: 16px; font-weight: 700; text-align: center; }
  .light { font-weight: 200; } .xlight { font-weight: 100; } .heavy { font-weight: 500; } .xheavy { font-weight: 550; } .bold { font-weight: bold; }
  .fs-s { font-size: 10px; } .fs-n { font-size: 12px; } .fs-m { font-size: 15px; } .fs-b { font-size: 18px; } .fs-2 { font-size: 30px; } .fs-3 { font-size: 42px; }
  .r90 { transform: rotate(90deg); } .r180 { transform: rotate(180deg); }
  .spaced { letter-spacing: 0.1em; white-space: nowrap; display: inline-block; }
  .even { display: flex; justify-content: space-evenly; align-items: center; width: 100%; }
  .center { text-align: center; }
  .container { background: #fff; width: 5.1cm; }
  .c1 { height: 7cm; overflow: hidden; transform: rotate(180deg); }
  .c1-1 { height: 1.7cm; padding: 0.5cm 0.5cm 0.3cm; }
  .c1-2 { height: 1.2cm; padding: 0 0.5cm; }
  .c1-3 { height: 1.9cm; padding: 0.2cm; }
  .c2 { margin-top: 0.4cm; }
  .c2-1 { height: 10.4cm; overflow: hidden; padding: 0 0.4cm; display: flex; }
  .c2-addi { height: 0.5cm; overflow: hidden; }
  .c2-2 { height: 2cm; overflow: hidden; display: flex; flex-direction: column; }
  .c2-3 { height: 2.1cm; overflow: hidden; }
  .c2-3-1 { padding: 0 0.5cm; }
  .c2-4 { height: 10.4cm; padding: 0 0.4cm; display: flex; flex-direction: column; }
  .stub { overflow: hidden; }
  .stub-inner { display: flex; flex-direction: column; align-items: center; padding: 0 0.2cm; }
  .stub-bar { padding: 0 0.2cm; height: 0.5cm; margin-bottom: 0.05cm; }
  .row-1 { display: flex; width: 100%; height: 48%; }
  .row-1 .col-1 { flex: 1; text-align: left; padding-left: 0.15cm; }
  .row-1 .col-2 { flex: 2; text-align: center; }
  .row-1 .col-3 { flex: 1; display: flex; justify-content: center; align-items: center; margin-top: 0.3cm; }
  .row-2 { display: flex; justify-content: center; align-items: center; width: 100%; height: 25%; }
  .row-3 { display: flex; width: 100%; height: 15%; }
  .row-3 .col-1 { flex: 1; text-align: left; padding: 0 5px 5px; }
  .row-3 .col-2 { flex: 1; text-align: right; padding: 0 5px 5px; }
  .endsection { height: 5.3cm; display: flex; margin-top: 1cm; margin-bottom: -0.2cm; flex-direction: column; justify-content: end; }
`

export function bagTagDocument(t: BagTag) {
  const barcode = code128Png(t.barcode)
  const plate = `${t.airline.iata_code} ${t.tag_number.slice(-6)}`
  const name = t.is_crew ? t.passenger : `${t.passenger} ${t.passenger_title ?? ''}`.trim()
  const destName = t.destination.name.toUpperCase()
  const crew = t.is_crew ? '# CREW BAG' : ''
  const date = t.date.toUpperCase() // legacy: 29SEP

  const via = (rotated: boolean) => `
    <div class="c2-2 ${rotated ? 'r180' : ''}"><div class="row-1"><div class="col-1"><span class="fs-m xlight">VIA</span></div></div></div><hr>`
  const to = (rotated: boolean) => `
    <div class="c2-2 ${rotated ? 'r180' : ''}">
      <div class="row-1">
        <div class="col-1"><span class="fs-m xlight">TO</span></div>
        <div class="col-2"><span class="fs-3 xheavy">${e(t.destination.code)}</span></div>
        <div class="col-3"><span class="fs-2 heavy">${e(t.piece.split('/')[0])}</span></div>
      </div>
      <div class="row-2"><span class="fs-n xlight center">${e(t.destination.name)}</span></div>
      <div class="row-3">
        <div class="col-1"><span class="spaced fs-b heavy">${e(t.flight_number)}</span></div>
        <div class="col-2"><span class="spaced fs-b heavy">${e(date)}</span></div>
      </div>
    </div><hr>`
  const bigBarcodes = `
    <div class="r90" style="margin-bottom:0.5cm;"><img src="${barcode}" alt="" style="width:4.4cm;height:4cm;"></div>
    <div><img src="${barcode}" alt="" style="width:4.4cm;height:4cm;"></div>`
  const stub = (barHeight: string) => `
    <div class="stub"><div class="stub-inner">
      <div class="even"><span class="spaced fs-s light">${e(t.flight_number)}</span><span class="spaced fs-s light">${e(date)}</span><span class="spaced fs-s light">${e(t.destination.code)}</span></div>
      <div class="stub-bar"><img src="${barcode}" alt="" style="width:4cm;height:${barHeight};"></div>
      <div style="margin-top:0.1cm;"><span class="spaced fs-s bold">${e(plate)} ${e(t.weight_kg)}kg</span></div>
    </div></div>`

  return `<!doctype html><html><head><meta charset="utf-8"><title>Bag tag ${e(t.tag_number)}</title>
<style>${BAG_TAG_CSS}</style></head><body>
<div class="container">
  <div class="c1">
    <div class="c1-1">${logo(t.airline.logo_url, t.airline.name, 'logo-img')}</div>
    <div class="c1-2"><img src="${barcode}" alt="" style="width:4cm;height:0.9cm;"></div>
    <div class="center"><span class="spaced fs-b bold">${e(plate)}</span></div>
    <div class="c1-3">
      <div class="even center"><span class="fs-n light">${e(name)}</span></div>
      <div class="even center"><span class="fs-n light">B/NO: ${e(t.tag_number)}</span></div>
      <div class="even center"><span class="fs-n light">${e(destName)}</span></div>
      <div class="even center"><span class="fs-n light">${e(t.flight_number)}</span><span class="fs-n light">${e(date)}</span><span class="fs-n light">${e(t.destination.code)}</span></div>
    </div>
  </div>

  <div class="c2">
    <div class="c2-1"><div class="r180">${bigBarcodes}
      <div class="center" style="margin-top:4px;"><span class="spaced fs-n bold">${e(plate)} ${e(t.weight_kg)}kg</span></div>
    </div></div>
    <div class="c2-addi r180"><div class="row-1"><div class="col-1"><span class="fs-m xlight">${crew}</span></div></div></div>
    <hr>
    ${via(true)}${via(true)}${to(true)}
    <div class="c2-3">
      <div class="c2-3-1">${logo(t.airline.logo_url, t.airline.name, 'logo-img')}</div>
      <div>
        <div class="even center"><span class="fs-s light">${e(name)}</span></div>
        <div class="even center"><span class="fs-s light">${e(t.origin)} / ${e(date)}</span><span class="fs-s light">${e(t.pnr ?? '')}</span></div>
      </div>
    </div>
    <hr>
    ${to(false)}${via(false)}${via(false)}
    <div class="c2-addi"><div class="row-1"><div class="col-1"><span class="fs-m xlight">${crew}</span></div></div></div>
    <div class="c2-4">${bigBarcodes}
      <div class="center" style="margin-top:5px;"><span class="spaced fs-n bold">${e(plate)} ${e(t.weight_kg)}kg</span></div>
    </div>
  </div>

  <div class="endsection">
    ${stub('0.7cm')}
    <div style="margin-top:0.5cm">${stub('0.7cm')}</div>
    ${stub('0.5cm')}
  </div>
</div>
</body></html>`
}

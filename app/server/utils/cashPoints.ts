export interface CashPoint {
  network: string
  label: string
  id: string
  name: string
  address: string
  locality: string
  dept: string
  phone: string
  hours: string
  lat: number
  lng: number
}

const num = (v: string): number => parseFloat(String(v ?? '').trim().replace(',', '.'))
const cell = (v: string): string => String(v ?? '').trim()

// BCU open-data CSV (semicolon-delimited), positionally consistent across institutions:
// 0 instCode;1 tipo;2 puntoCode;3 Nombre;4 Lat;5 Lng;6 Direccion;7 Barrio/Localidad;8 Depto;9 Pais;10 Telefonos;11 Horario;...
export function parseBcuCsv(text: string, network: string, label: string): CashPoint[] {
  const out: CashPoint[] = []
  const lines = String(text || '').split(/\r?\n/)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line || !line.trim()) continue
    const c = line.split(';')
    if (c.length < 8) continue
    const lat = num(c[4])
    const lng = num(c[5])
    if (!isFinite(lat) || !isFinite(lng) || lat === 0 || lng === 0) continue
    if (lat < -35.5 || lat > -29.5 || lng < -59 || lng > -52.5) continue // Uruguay bbox
    out.push({
      network,
      label,
      id: `${network}-${cell(c[2]) || String(i)}`,
      name: cell(c[3]),
      address: cell(c[6]),
      locality: cell(c[7]),
      dept: cell(c[8]),
      phone: cell(c[10]),
      hours: cell(c[11]),
      lat,
      lng,
    })
  }
  return out
}

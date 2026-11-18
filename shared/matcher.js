// shared/matcher.js
// ============================================================================
//  On-device "AI" text understanding for the servicesDatabase catalog
//  (RU / UZ / EN). Shared by the website and the chat server's demo mode.
//    matchServices(text, services) -> best matching service ids
//    matchDistrict(text, districts) -> Tashkent district or null
//    detectLang(text)               -> 'ru' | 'uz' | 'en'
// ============================================================================

/** Words that identify the appliance / category. */
export const CATEGORY_WORDS = {
  'air-conditioners': ['кондиц', 'кондей', 'сплит', 'konditsioner', 'konditsaner', 'air condition', ' ac '],
  'washing-machines': ['стирал', 'стиральн', 'стирк', 'washing', 'washer', 'kir yuv'],
  refrigerators: ['холодильн', 'морозил', 'fridge', 'refrigerator', 'freezer', 'muzlatgich', 'xolodilnik'],
  dishwashers: ['посудомо', 'посудомой', 'dishwasher', 'idish yuv'],
  tvs: ['телевизор', 'телек', ' tv', 'television', 'televizor'],
  stoves: ['плит', 'газов', 'конфор', 'stove', 'cooker', 'plita', 'gaz'],
  microwaves: ['микровол', 'свч', 'microwave', 'mikrovolnovka'],
  handyman: ['муж на час', 'мастер на все', 'мелк', 'handyman', 'смесител', 'розетк', 'выключат', 'сантех', 'электрик', 'faucet', 'socket', 'outlet', 'rozetka', "jo'mrak"],
}

/** Words that identify the specific job (symptom or action). */
export const SERVICE_WORDS = {
  'ac-install-standard': ['установ', 'монтаж', 'постав', "o'rnat", 'ornat', 'install', 'mount', 'подключ', 'новый'],
  'ac-install-highrise': ['высот', 'этаж', 'альпин', 'balandlik', 'high-rise', 'highrise', 'floor'],
  'ac-dismantle': ['демонтаж', 'снять', 'dismantl', 'remove', 'yechib'],
  'ac-relocation': ['перенос', 'перенест', 'переустан', 'relocat', 'move', "ko'chir"],
  'ac-freon-refill': ['фреон', 'заправ', 'не холод', 'не охлаж', 'плохо холод', 'freon', 'refill', 'sovutmay', 'not cool'],
  'ac-cleaning-full': ['чист', 'пахнет', 'запах', 'грязн', 'tozala', 'clean', 'smell'],
  'ac-prevention': ['профилакт', 'обслужив', 'maintenance', 'profilakt'],
  'ac-repair-general': ['ремонт', 'сломал', 'не работ', 'не включ', 'repair', 'broken', "ta'mir", 'tamir', 'buzil', 'ishlamay'],
  'ac-leak-fix': ['утечк', 'течет', 'капает', 'вода', 'leak', 'drip', 'oqyap', 'tomchi'],
  'ac-false-call': ['ложн', 'false call'],
  'wm-diagnostic': ['диагност', 'не знаю', 'diagnos', 'tekshir'],
  'wm-install': ['установ', 'подключ', 'install', 'connect', "o'rnat", 'ulab'],
  'wm-bearing-replace': ['подшипник', 'гул', 'шум', 'гремит', 'bearing', 'noise', 'shovqin'],
  'wm-drum-repair': ['барабан', 'не крутит', 'drum', 'baraban'],
  'wm-board-repair': ['плат', 'модул', 'электрон', 'ошибк', 'board', 'error', 'plata'],
  'wm-pump-replace': ['помп', 'насос', 'не слив', 'вода стоит', 'pump', 'drain', "doesn't drain", 'not draining', 'suv chiqmay', 'chiqarmay', 'suvni chiq'],
  'wm-heater-replace': ['тэн', 'не греет', 'холодной вод', 'нагрев', 'heater', 'not heat', 'isitmay'],
  'wm-motor-replace': ['мотор', 'двигат', 'щетк', 'motor', 'brush'],
  'wm-ubl-replace': ['убл', 'блокиров', 'люк', 'не открыв', 'door lock', 'eshik'],
  'wm-general-repair': ['ремонт', 'сломал', 'не работ', 'капитальн', 'течет', 'repair', 'broken', 'leak', "ta'mir", 'buzil', 'ishlamay', 'oqyap'],
  'fr-diagnostic': ['диагност', 'diagnos', 'tekshir'],
  'fr-compressor-replace': ['компрессор', 'щелкает', 'compressor', 'kompressor'],
  'fr-freon-refill': ['фреон', 'заправ', 'не морозит', 'плохо морозит', 'не холод', 'freon', 'not cold', 'sovutmay'],
  'fr-thermostat-replace': ['термостат', 'терморегул', 'не отключ', 'постоянно работает', 'thermostat'],
  'fr-nofrost-fuse': ['предохранит', 'fuse'],
  'fr-nofrost-repair': ['no frost', 'no-frost', 'ноу фрост', 'нофрост', 'шуба', 'намерз', 'лед', 'ice'],
  'fr-board-repair': ['плат', 'модул', 'электрон', 'board', 'plata'],
  'fr-leak-fix': ['утечк', 'пайк', 'трубк', 'leak', 'oqish'],
  'dw-diagnostic': ['диагност', 'не работ', 'сломал', 'diagnos', 'broken', 'ishlamay'],
  'dw-hose-replace': ['шланг', 'hose', 'shlang'],
  'dw-pump-replace': ['насос', 'помп', 'не слив', 'вода стоит', 'pump', 'drain'],
  'dw-heater-replace': ['тэн', 'не греет', 'не нагрева', 'heater'],
  'dw-ubl-replace': ['убл', 'блокиров', 'дверц', 'люк', 'door lock'],
  'dw-filter-cleaning': ['фильтр', 'чист', 'засор', 'filter', 'clean', 'clog'],
  'tv-diagnostic': ['диагност', 'не работ', 'diagnos', 'ishlamay'],
  'tv-backlight-replace': ['подсвет', 'темн', 'нет изображ', 'изображения нет', 'звук есть', 'backlight', 'dark', 'no picture', 'no image', 'sound but', 'ovoz bor', 'tasvir yoʻq', "tasvir yo'q"],
  'tv-matrix-replace': ['матриц', 'разбит', 'трещин', 'полос', 'экран', 'matrix', 'screen', 'crack'],
  'tv-board-repair': ['плат', 'питани', 'инвертор', 'не включ', 'board', 'power'],
  'tv-cable-replace': ['шлейф', 'кабел', 'рябь', 'мерца', 'cable', 'flicker'],
  'st-diagnostic': ['диагност', 'не работ', 'diagnos'],
  'st-burner-replace': ['конфорк', 'горелк', 'не горит', 'burner'],
  'st-ignition-replace': ['поджиг', 'термопар', 'не зажига', 'ignition'],
  'st-gas-valve-replace': ['кран', 'клапан', 'запах газа', 'пахнет газ', 'утечка газа', 'valve', 'gas smell'],
  'st-install': ['установ', 'подключ', 'install', 'connect', "o'rnat"],
  'mw-diagnostic': ['диагност', 'diagnos'],
  'mw-general-repair': ['ремонт', 'сломал', 'не работ', 'repair', 'broken', 'ishlamay'],
  'mw-magnetron-replace': ['магнетрон', 'не греет', 'не нагрева', 'magnetron', 'not heat'],
  'mw-transformer-replace': ['трансформ', 'гудит', 'transformer', 'hum'],
  'mw-diode-capacitor': ['диод', 'конденсат', 'diode', 'capacitor'],
  'mw-mica-replace': ['слюд', 'искрит', 'искры', 'mica', 'spark'],
  'hm-handyman-hour': ['муж на час', 'на час', 'мелк', 'повес', 'собрать', 'handyman', 'hour', 'mayda'],
  'hm-faucet-replace': ['смесител', 'кран', 'сантех', 'faucet', 'tap', "jo'mrak", 'kran'],
  'hm-outlet-replace': ['розетк', 'выключат', 'электрик', 'socket', 'outlet', 'switch', 'rozetka'],
}

/** When only the appliance is recognised, start with these (diagnostics first). */
const DEFAULT_SUFFIXES = ['-diagnostic', '-repair-general', '-general-repair', '-handyman-hour']

/**
 * @param {string} text
 * @param {{id:string, categoryId:string}[]} services
 * @param {number} [limit=3]
 * @returns {string[]} service ids, best first
 */
export function matchServices(text, services, limit = 3) {
  // ё -> е so "течёт" and "течет" match the same stems
  const t = ` ${String(text || '').toLowerCase().replace(/ё/g, 'е')} `
  const hits = (words = []) => words.filter((w) => t.includes(w)).length

  const catHit = new Map(Object.entries(CATEGORY_WORDS).map(([c, words]) => [c, hits(words) > 0]))
  const scored = services.map((s) => {
    const act = hits(SERVICE_WORDS[s.id])
    const cat = catHit.get(s.categoryId)
    // appliance + symptom is strong; a symptom alone only counts if very specific (2+ words)
    return { id: s.id, cat: s.categoryId, score: cat ? (act ? 2 + act * 3 : 0) : act >= 2 ? act : 0 }
  })

  // Appliance recognised but no symptom → its diagnostics / general repair.
  for (const [cat, ok] of catHit) {
    if (!ok || scored.some((x) => x.cat === cat && x.score > 0)) continue
    for (const suf of DEFAULT_SUFFIXES) {
      const x = scored.find((y) => y.cat === cat && y.id.endsWith(suf))
      if (x) { x.score = 1; break }
    }
  }

  const ranked = scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score)
  if (!ranked.length) return []
  const top = ranked[0].score
  return ranked.filter((x) => x.score >= top - 2).slice(0, limit).map((x) => x.id)
}

/** Tashkent district mentioned in text, e.g. "в Юнусабаде" -> "Юнусабадский". */
export function matchDistrict(text, districts) {
  const t = String(text || '').toLowerCase()
  const aliases = {
    'Яккасарайский': ['яккасара', 'yakkasaroy'], 'Бектемирский': ['бектемир', 'bektemir'], 'Сергелийский': ['сергел', 'sergeli'],
    'Учтепинский': ['учтеп', 'uchtepa'], 'Мирзо-Улугбекский': ['мирзо', 'улугбек', "ulug'bek", 'ulugbek'], 'Юнусабадский': ['юнусабад', 'yunusobod', 'yunusabad'],
    'Мирабадский': ['мирабад', 'mirobod'], 'Яшнабадский': ['яшнабад', 'yashnobod'], 'Чиланзарский': ['чиланзар', 'chilonzor', 'chilanzar'],
    'Алмазарский': ['алмазар', 'almazar'], 'Шайхантахурский': ['шайхантах', 'shayxontohur'], 'Олмазорский': ['олмазор', 'olmazor'], 'Янгихаётский': ['янгихает', 'янгихаёт', 'yangihayot'],
  }
  for (const d of districts) if ((aliases[d] || [d.toLowerCase()]).some((a) => t.includes(a))) return d
  return null
}

/** Rough language detection for replies. */
export function detectLang(text) {
  const t = String(text || '').toLowerCase()
  if (/[а-яё]/.test(t)) return 'ru'
  if (/(o'|g'|oʻ|gʻ|salom|qanday|kerak|narx|qancha|ishlamay|buzil|usta|tuzat|mashina|yapti|suv|muzlatgich|konditsioner|televizor|qilish)/.test(t)) return 'uz'
  return 'en'
}

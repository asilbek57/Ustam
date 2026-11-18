// shared/catalogI18n.js
// ============================================================================
//  Translations of catalog terms. Russian is the original language of
//  servicesDatabase.json; here are English and Uzbek versions of category
//  titles, service names, units, warranty labels and Tashkent districts.
//  Long descriptions and source notes stay in Russian (as in the source).
// ============================================================================

/** key (id or Russian text) -> [English, Uzbek] */
const T = {
  // categories
  'air-conditioners': ['Air conditioners', 'Konditsionerlar'],
  'washing-machines': ['Washing machines', 'Kir yuvish mashinalari'],
  refrigerators: ['Refrigerators', 'Muzlatkichlar'],
  dishwashers: ['Dishwashers', 'Idish yuvish mashinalari'],
  tvs: ['TVs', 'Televizorlar'],
  stoves: ['Gas & electric stoves', 'Gaz va elektr plitalar'],
  microwaves: ['Microwaves', 'Mikrotoʻlqinli pechlar'],
  handyman: ['Handyman', 'Uy ustasi'],
  // services
  'ac-install-standard': ['AC installation (standard)', 'Konditsioner oʻrnatish (standart)'],
  'ac-install-highrise': ['AC installation (high-rise work)', 'Konditsioner oʻrnatish (balandlikda)'],
  'ac-dismantle': ['AC removal', 'Konditsionerni yechib olish'],
  'ac-relocation': ['AC relocation', 'Konditsionerni koʻchirish'],
  'ac-freon-refill': ['AC freon refill', 'Konditsionerga freon toʻldirish'],
  'ac-cleaning-full': ['Full AC cleaning', 'Konditsionerni toʻliq tozalash'],
  'ac-prevention': ['AC maintenance', 'Konditsioner profilaktikasi'],
  'ac-repair-general': ['AC repair (general)', 'Konditsioner taʼmiri (umumiy)'],
  'ac-leak-fix': ['AC leak fix', 'Konditsioner oqishini bartaraf etish'],
  'ac-false-call': ['False call (repair declined)', 'Soxta chaqiruv (taʼmirdan voz kechish)'],
  'wm-diagnostic': ['Washing machine diagnostics (call-out)', 'Kir yuvish mashinasi diagnostikasi'],
  'wm-install': ['Washing machine installation', 'Kir yuvish mashinasini oʻrnatish'],
  'wm-bearing-replace': ['Bearing replacement', 'Podshipnikni almashtirish'],
  'wm-drum-repair': ['Drum repair', 'Baraban taʼmiri'],
  'wm-board-repair': ['Control board repair', 'Boshqaruv platasi taʼmiri'],
  'wm-pump-replace': ['Drain pump replacement', 'Nasosni almashtirish'],
  'wm-heater-replace': ['Heating element replacement', 'TEN (isitgich)ni almashtirish'],
  'wm-motor-replace': ['Motor / brushes replacement', 'Motor / choʻtkalarni almashtirish'],
  'wm-ubl-replace': ['Door lock (UBL) replacement', 'Eshik qulfi (UBL)ni almashtirish'],
  'wm-general-repair': ['Washing machine overhaul', 'Kir yuvish mashinasini kapital taʼmirlash'],
  'fr-diagnostic': ['Refrigerator diagnostics (call-out)', 'Muzlatkich diagnostikasi'],
  'fr-compressor-replace': ['Compressor replacement', 'Kompressorni almashtirish'],
  'fr-freon-refill': ['Refrigerator freon refill', 'Muzlatkichga freon toʻldirish'],
  'fr-thermostat-replace': ['Thermostat replacement', 'Termostatni almashtirish'],
  'fr-nofrost-fuse': ['No-Frost fuse replacement', 'No-Frost saqlagichini almashtirish'],
  'fr-nofrost-repair': ['No-Frost system repair', 'No-Frost tizimi taʼmiri'],
  'fr-board-repair': ['Refrigerator board repair', 'Muzlatkich platasi taʼmiri'],
  'fr-leak-fix': ['Freon leak fix (tube soldering)', 'Freon oqishini bartaraf etish'],
  'dw-diagnostic': ['Dishwasher diagnostics', 'Idish yuvish mashinasi diagnostikasi'],
  'dw-hose-replace': ['Drain / inlet hose replacement', 'Shlangni almashtirish'],
  'dw-pump-replace': ['Drain pump replacement', 'Nasosni almashtirish'],
  'dw-heater-replace': ['Dishwasher heater replacement', 'Isitgichni almashtirish'],
  'dw-ubl-replace': ['Door lock replacement', 'Eshik qulfini almashtirish'],
  'dw-filter-cleaning': ['Filter and pump cleaning', 'Filtr va nasosni tozalash'],
  'tv-diagnostic': ['TV diagnostics', 'Televizor diagnostikasi'],
  'tv-backlight-replace': ['Backlight replacement (LED strips)', 'Orqa yoritishni almashtirish'],
  'tv-matrix-replace': ['TV screen (matrix) replacement', 'Televizor ekranini almashtirish'],
  'tv-board-repair': ['TV board repair (power, inverter, main)', 'Televizor platalari taʼmiri'],
  'tv-cable-replace': ['Matrix cable replacement', 'Shleyf / kabelni almashtirish'],
  'st-diagnostic': ['Stove diagnostics', 'Plita diagnostikasi'],
  'st-burner-replace': ['Burner replacement', 'Gorelkani almashtirish'],
  'st-ignition-replace': ['Ignition / thermocouple replacement', 'Yondirgich / termoparani almashtirish'],
  'st-gas-valve-replace': ['Gas valve replacement', 'Gaz kranini almashtirish'],
  'st-install': ['Stove installation', 'Plitani oʻrnatish'],
  'mw-diagnostic': ['Microwave diagnostics', 'Mikrotoʻlqinli pech diagnostikasi'],
  'mw-general-repair': ['Microwave repair (general)', 'Mikrotoʻlqinli pech taʼmiri'],
  'mw-magnetron-replace': ['Magnetron replacement', 'Magnetronni almashtirish'],
  'mw-transformer-replace': ['High-voltage transformer replacement', 'Transformatorni almashtirish'],
  'mw-diode-capacitor': ['HV diode / capacitor replacement', 'Diod / kondensatorni almashtirish'],
  'mw-mica-replace': ['Mica plate replacement', 'Slyuda plastinani almashtirish'],
  'hm-handyman-hour': ['Handyman by the hour', 'Soatbay uy ustasi'],
  'hm-faucet-replace': ['Faucet / plumbing replacement', 'Jomrak / santexnikani almashtirish'],
  'hm-outlet-replace': ['Sockets, switches, small electrics', 'Rozetka va oʻchirgichlar'],
  // units
  'за сплит-систему': ['per split system', 'split tizim uchun'],
  'за заправку': ['per refill', 'toʻldirish uchun'],
  'за услугу': ['per service', 'xizmat uchun'],
  'от': ['from', 'dan'],
  'за выезд': ['per call-out', 'chaqiruv uchun'],
  'за установку': ['per installation', 'oʻrnatish uchun'],
  'за работу': ['labour', 'ish uchun'],
  'за работу + запчасть': ['labour + part', 'ish + ehtiyot qism'],
  'за час / выезд': ['per hour / call-out', 'soat / chaqiruv uchun'],
  'за точку': ['per point', 'har bir nuqta uchun'],
  // warranty
  '1 год': ['1 year', '1 yil'],
  '6 мес': ['6 months', '6 oy'],
  '6–12 мес': ['6–12 months', '6–12 oy'],
  '6 мес – 5 лет': ['6 months – 5 years', '6 oy – 5 yil'],
  // master type & specialisations
  'Частный мастер': ['Private master', 'Xususiy usta'],
  'Сервисный центр': ['Service centre', 'Servis markazi'],
  // districts
  'Яккасарайский': ['Yakkasaray', 'Yakkasaroy'],
  'Бектемирский': ['Bektemir', 'Bektemir'],
  'Сергелийский': ['Sergeli', 'Sergeli'],
  'Учтепинский': ['Uchtepa', 'Uchtepa'],
  'Мирзо-Улугбекский': ['Mirzo-Ulugbek', 'Mirzo Ulugʻbek'],
  'Юнусабадский': ['Yunusabad', 'Yunusobod'],
  'Мирабадский': ['Mirabad', 'Mirobod'],
  'Яшнабадский': ['Yashnabad', 'Yashnobod'],
  'Чиланзарский': ['Chilanzar', 'Chilonzor'],
  'Алмазарский': ['Almazar', 'Olmazor'],
  'Шайхантахурский': ['Shaykhantakhur', 'Shayxontohur'],
  'Олмазорский': ['Olmazor', 'Olmazor'],
  'Янгихаётский': ['Yangihayot', 'Yangihayot'],
  'Янгиюль': ['Yangiyul', 'Yangiyoʻl'],
  'Ташкентская обл.': ['Tashkent region', 'Toshkent viloyati'],
  'Ташкент': ['Tashkent', 'Toshkent'],
}

/**
 * Translate a catalog term. For Russian returns `ru` (the original text).
 * @param {string} key  id or Russian text
 * @param {'ru'|'en'|'uz'} lang
 * @param {string} [ru] original Russian text (defaults to key)
 */
export function tr(key, lang, ru) {
  if (lang === 'ru') return ru ?? key
  const v = T[key]
  return v ? v[lang === 'en' ? 0 : 1] : ru ?? key
}

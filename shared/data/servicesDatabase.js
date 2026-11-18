/**
 * servicesDatabase.js
 * -----------------------------------------------------------------------------
 * Локальная база цен на услуги по ремонту бытовой техники в Ташкенте.
 * Источник данных: объявления OLX.uz (Ташкент) + сервисные сайты, найденные
 * через OLX и подтверждённые прайс-листами. Все цены — в узбекских сумах (UZS),
 * актуальны на 2026 год. Цены отражают объявления на OLX Ташкент и сервисных
 * центров, рекламирующихся через OLX; реальная цена зависит от модели техники,
 * сложности работ и стоимости запчастей.
 *
 * Использование в React:
 *   import { servicesDatabase, categories, getAllServices } from './servicesDatabase';
 *
 * Структура записи услуги:
 *   {
 *     id:            string  — уникальный slug
 *     name:          string  — название услуги
 *     priceFrom:     number  — минимальная цена, сум
 *     priceTo:       number|null — верхняя граница цены (если диапазон)
 *     currency:      'UZS'
 *     unit:          string  — за что цена ('за услугу', 'за выезд' и т.д.)
 *     description:   string  — что входит в услугу
 *     warranty:      string  — гарантия
 *     district:      string[] — районы выезда (Ташкент)
 *     source:        { olx: string|null, web: string|null, note: string }
 *   }
 * -----------------------------------------------------------------------------
 */

export const META = {
  city: 'Ташкент',
  currency: 'UZS',
  currencySymbol: 'сум',
  updatedAt: '2026-11-18',
  disclaimer:
    'Цены собраны из открытых объявлений на OLX.uz (Ташкент) и сайтов ' +
    'сервисных центров, рекламирующихся через OLX. Итоговая стоимость ' +
    'зависит от модели техники, сложности работ и стоимости запчастей.',
};

// Все районы Ташкента, по которым работают мастера с OLX
export const TASHKENT_DISTRICTS = [
  'Яккасарайский',
  'Бектемирский',
  'Сергелийский',
  'Учтепинский',
  'Мирзо-Улугбекский',
  'Юнусабадский',
  'Мирабадский',
  'Яшнабадский',
  'Чиланзарский',
  'Алмазарский',
  'Шайхантахурский',
  'Олмазорский',
  'Янгихаётский',
];

// ---------------------------------------------------------------------------
// Категория 1: КОНДИЦИОНЕРЫ
// ---------------------------------------------------------------------------
const airConditionerServices = [
  {
    id: 'ac-install-standard',
    name: 'Установка / монтаж кондиционера (стандарт)',
    priceFrom: 350000,
    priceTo: 700000,
    currency: 'UZS',
    unit: 'за сплит-систему',
    description:
      'Монтаж сплит-системы до 24 000 BTU в один этап: крепление ' +
      'внутреннего и наружного блока, сверление одного отверстия в стене, ' +
      'прокладка трассы до 3 м, подключение, вакуумирование, тест.',
    warranty: '1 год',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/tashkent/q-%D1%83%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0-%D0%BA%D0%BE%D0%BD%D0%B4%D0%B8%D1%86%D0%B8%D0%BE%D0%BD%D0%B5%D1%80%D1%8B',
      web: null,
      note:
        'Диапазон «от 350 000 до 700 000 сум» — по объявлениям OLX Ташкент ' +
        '(«Установка кондиционера в Ташкенте — цены, мастера»).',
    },
  },
  {
    id: 'ac-install-highrise',
    name: 'Установка кондиционера (с высотными работами)',
    priceFrom: 600000,
    priceTo: null,
    currency: 'UZS',
    unit: 'за сплит-систему',
    description:
      'Монтаж наружного блока выше 2-го этажа или в сложнодоступном месте, ' +
      'с использованием альпснаряжения / вышки. Включает стандартный монтаж.',
    warranty: '1 год',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/tashkent/q-%D1%83%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0-%D0%BA%D0%BE%D0%BD%D0%B4%D0%B8%D1%86%D0%B8%D0%BE%D0%BD%D0%B5%D1%80%D1%8B',
      web: null,
      note: 'OLX Ташкент: «Установка с высотными работами — от 600 000 сум».',
    },
  },
  {
    id: 'ac-dismantle',
    name: 'Демонтаж кондиционера',
    priceFrom: 100000,
    priceTo: 251000,
    currency: 'UZS',
    unit: 'за сплит-систему',
    description:
      'Снятие внутреннего и наружного блока с сохранением фреона (либо ' +
      'спуск фреона). Цена зависит от этажа и доступа к блоку.',
    warranty: '—',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/tashkent/q-%D1%83%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0-%D0%BA%D0%BE%D0%BD%D0%B4%D0%B8%D1%86%D0%B8%D0%BE%D0%BD%D0%B5%D1%80%D1%8B',
      web: null,
      note:
        'OLX Ташкент: «Демонтаж старого кондиционера — от 100 000 сум». ' +
        'Также встречается 251 000 сум у отдельных сервисов.',
    },
  },
  {
    id: 'ac-relocation',
    name: 'Перенос кондиционера (демонтаж + монтаж на новом месте)',
    priceFrom: 901000,
    priceTo: null,
    currency: 'UZS',
    unit: 'за сплит-систему',
    description:
      'Полный цикл: снятие старого кондиционера с перекачкой фреона, ' +
      'транспортировка и монтаж на новом месте с новой трассой до 3 м.',
    warranty: '1 год',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/tashkent/q-%D1%83%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0-%D0%BA%D0%BE%D0%BD%D0%B4%D0%B8%D1%86%D0%B8%D0%BE%D0%BD%D0%B5%D1%80%D1%8B',
      web: null,
      note: 'OLX Ташкент: «Перенос кондиционера — 901 000 сум».',
    },
  },
  {
    id: 'ac-freon-refill',
    name: 'Заправка кондиционера фреоном',
    priceFrom: 150000,
    priceTo: 380000,
    currency: 'UZS',
    unit: 'за заправку',
    description:
      'Заправка фреоном R410A / R32 / R22 + поиск и устранение мелких ' +
      'утечек, контроль давления. Цена зависит от типа фреона и объёма.',
    warranty: '6–12 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://m.olx.uz/d/obyavlenie/master-po-remontu-i-obsluzhivaniyu-konditsionerov-tashkent-chistka-zapra-ID4lbKx.html',
      web: 'https://serviceplus.uz/ustanovka',
      note:
        'OLX: «Заправка фреоном — от 150 000 сум». Serviceplus.uz: ' +
        '«от 380 000 сум». Средний диапазон по Ташкенту.',
    },
  },
  {
    id: 'ac-cleaning-full',
    name: 'Полная чистка кондиционера',
    priceFrom: 120000,
    priceTo: 300000,
    currency: 'UZS',
    unit: 'за сплит-систему',
    description:
      'Глубокая чистка внутреннего и наружного блока от пыли, плесени и ' +
      'бактерий, мойка под давлением, антибактериальная обработка, чистка ' +
      'фильтров и дренажа.',
    warranty: '—',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://m.olx.uz/d/obyavlenie/master-po-remontu-i-obsluzhivaniyu-konditsionerov-tashkent-chistka-zapra-ID4lbKx.html',
      web: 'https://serviceplus.uz/ustanovka',
      note:
        'OLX: «Чистка полная — от 150 000 сум, профилактика — от 120 000 ' +
        'сум». Serviceplus: «Чистка — от 300 000 сум».',
    },
  },
  {
    id: 'ac-prevention',
    name: 'Профилактика и обслуживание кондиционера',
    priceFrom: 120000,
    priceTo: null,
    currency: 'UZS',
    unit: 'за услугу',
    description:
      'Диагностика и профилактическое обслуживание: осмотр узлов, чистка ' +
      'фильтров, проверка давления фреона, тестовый запуск.',
    warranty: '—',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://m.olx.uz/d/obyavlenie/master-po-remontu-i-obsluzhivaniyu-konditsionerov-tashkent-chistka-zapra-ID4lbKx.html',
      web: null,
      note: 'OLX: «Профилактика и обслуживание — от 120 000 сум».',
    },
  },
  {
    id: 'ac-repair-general',
    name: 'Ремонт кондиционера (общий)',
    priceFrom: 200000,
    priceTo: null,
    currency: 'UZS',
    unit: 'от',
    description:
      'Ремонт любой сложности: не дует, не холодит, течёт вода, шумит, не ' +
      'включается. Точная цена — после диагностики.',
    warranty: '6–12 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://m.olx.uz/d/obyavlenie/master-po-remontu-i-obsluzhivaniyu-konditsionerov-tashkent-chistka-zapra-ID4lbKx.html',
      web: null,
      note: 'OLX: «Ремонт — от 200 000 сум (точная цена после диагностики)».',
    },
  },
  {
    id: 'ac-leak-fix',
    name: 'Устранение утечки системы кондиционера',
    priceFrom: 200000,
    priceTo: null,
    currency: 'UZS',
    unit: 'за услугу',
    description:
      'Поиск утечки, пайка алюминиевых/медных труб, замена проколов, ' +
      'вакуумирование и повторная заправка.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/tashkent/q-%D1%83%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0-%D0%BA%D0%BE%D0%BD%D0%B4%D0%B8%D1%86%D0%B8%D0%BE%D0%BD%D0%B5%D1%80%D1%8B',
      web: null,
      note: 'OLX Ташкент (прайс сервис-центра): «Устранение утечки — 200 000 сум».',
    },
  },
  {
    id: 'ac-false-call',
    name: 'Ложный вызов мастера (отказ от ремонта)',
    priceFrom: 50000,
    priceTo: null,
    currency: 'UZS',
    unit: 'за выезд',
    description:
      'Выезд мастера и диагностика, если клиент отказывается от ремонта ' +
      'после диагностики.',
    warranty: '—',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/tashkent/q-%D1%83%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0-%D0%BA%D0%BE%D0%BD%D0%B4%D0%B8%D1%86%D0%B8%D0%BE%D0%BD%D0%B5%D1%80%D1%8B',
      web: null,
      note: 'OLX: «За ложный вызов — 50 000 сум» (аналогично стиральным машинам).',
    },
  },
];

// ---------------------------------------------------------------------------
// Категория 2: СТИРАЛЬНЫЕ МАШИНЫ
// ---------------------------------------------------------------------------
const washingMachineServices = [
  {
    id: 'wm-diagnostic',
    name: 'Диагностика стиральной машины (выезд)',
    priceFrom: 0,
    priceTo: 50000,
    currency: 'UZS',
    unit: 'за выезд',
    description:
      'Выезд мастера, осмотр техники, определение причины поломки. ' +
      'Бесплатно при последующем ремонте. Если клиент отказывается — ' +
      'только выезд 50 000 сум.',
    warranty: '—',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%81%D1%82%D0%B8%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D1%85-%D0%BC%D0%B0%D1%88%D0%B8%D0%BD/',
      web: 'https://service-eco.uz/washer',
      note:
        'OLX Ташкент: «Диагностика 0 сум, при отказе от ремонта — выезд ' +
        '50 000 сум». Service-eco.uz: «Диагностика и выезд бесплатно».',
    },
  },
  {
    id: 'wm-install',
    name: 'Установка и подключение стиральной машины',
    priceFrom: 87000,
    priceTo: 150000,
    currency: 'UZS',
    unit: 'за установку',
    description:
      'Подключение к водопроводу, канализации и электросети, выравнивание ' +
      'по уровню, тестовый запуск.',
    warranty: '1 год',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%81%D1%82%D0%B8%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D1%85-%D0%BC%D0%B0%D1%88%D0%B8%D0%BD/',
      web: 'https://service-eco.uz/washer',
      note: 'Service-eco.uz: «Установка и подключение — от 87 000 сум (гарантия 1 год)».',
    },
  },
  {
    id: 'wm-bearing-replace',
    name: 'Замена подшипника стиральной машины',
    priceFrom: 45000,
    priceTo: 350000,
    currency: 'UZS',
    unit: 'за работу',
    description:
      'Разборка бака, выпрессовка старых и запрессовка новых подшипников, ' +
      'замена сальника, сборка. Цена без стоимости запчастей.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%81%D1%82%D0%B8%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D1%85-%D0%BC%D0%B0%D1%88%D0%B8%D0%BD/',
      web: 'https://service-eco.uz/washer',
      note:
        'Service-eco.uz: «Замена подшипника — от 45 000 сум». Верхняя граница ' +
        'по OLX-объявлениям — 350 000 сум (с разборкой неразборного бака).',
    },
  },
  {
    id: 'wm-drum-repair',
    name: 'Ремонт барабана стиральной машины',
    priceFrom: 42000,
    priceTo: 250000,
    currency: 'UZS',
    unit: 'за работу',
    description:
      'Устранение биения, замена крестовины, снятие застрявших предметов, ' +
      'восстановление геометрии бака.',
    warranty: '1 год',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%81%D1%82%D0%B8%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D1%85-%D0%BC%D0%B0%D1%88%D0%B8%D0%BD/',
      web: 'https://service-eco.uz/washer',
      note: 'Service-eco.uz: «Ремонт барабана — от 42 000 сум (гарантия 1 год)».',
    },
  },
  {
    id: 'wm-board-repair',
    name: 'Ремонт платы управления стиральной машины',
    priceFrom: 150000,
    priceTo: 600000,
    currency: 'UZS',
    unit: 'за услугу',
    description:
      'Диагностика модуля управления, пропайка контактов, замена реле, ' +
      'симисторов, процессора. Цена зависит от бренда (Bosch, LG, Samsung, ' +
      'Indesit и т.д.).',
    warranty: '6–12 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%81%D1%82%D0%B8%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D1%85-%D0%BC%D0%B0%D1%88%D0%B8%D0%BD/',
      web: 'https://service-eco.uz/washer',
      note: 'Service-eco.uz (прайс): «Ремонт платы управления — от 150 000 сум».',
    },
  },
  {
    id: 'wm-pump-replace',
    name: 'Замена помпы (сливного насоса)',
    priceFrom: 80000,
    priceTo: 250000,
    currency: 'UZS',
    unit: 'за работу',
    description:
      'Демонтаж старого сливного насоса, установка нового, проверка слива. ' +
      'Запчасти отдельно.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%81%D1%82%D0%B8%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D1%85-%D0%BC%D0%B0%D1%88%D0%B8%D0%BD/',
      web: null,
      note:
        'OLX Ташкент (объявления сервис-центров): «Замена помпы — ' +
        'от 80 000 сум», верхняя граница зависит от бренда машины.',
    },
  },
  {
    id: 'wm-heater-replace',
    name: 'Замена ТЭНа (нагревательного элемента)',
    priceFrom: 90000,
    priceTo: 220000,
    currency: 'UZS',
    unit: 'за работу',
    description:
      'Демонтаж задней стенки / передней панели, замена ТЭНа, проверка ' +
      'нагрева. Запчасти отдельно.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%81%D1%82%D0%B8%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D1%85-%D0%BC%D0%B0%D1%88%D0%B8%D0%BD/',
      web: null,
      note: 'OLX Ташкент: «Замена ТЭНа — от 90 000 сум» (сервис-центры).',
    },
  },
  {
    id: 'wm-motor-replace',
    name: 'Замена электродвигателя / щёток мотора',
    priceFrom: 120000,
    priceTo: 450000,
    currency: 'UZS',
    unit: 'за работу',
    description:
      'Демонтаж мотора, замена угольных щёток или самого двигателя, ' +
      'проверка работы во всех режимах отжима.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%81%D1%82%D0%B8%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D1%85-%D0%BC%D0%B0%D1%88%D0%B8%D0%BD/',
      web: null,
      note: 'OLX Ташкент: «Замена щёток мотора — от 120 000 сум» (сервис-центры).',
    },
  },
  {
    id: 'wm-ubl-replace',
    name: 'Замена УБЛ (устройства блокировки люка)',
    priceFrom: 90000,
    priceTo: 200000,
    currency: 'UZS',
    unit: 'за работу',
    description:
      'Замена блокировки люка, если машинка не запускает стирку или люк не ' +
      'открывается после цикла.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%81%D1%82%D0%B8%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D1%85-%D0%BC%D0%B0%D1%88%D0%B8%D0%BD/',
      web: null,
      note: 'OLX Ташкент: «Замена УБЛ — от 90 000 сум» (объявления сервис-центров).',
    },
  },
  {
    id: 'wm-general-repair',
    name: 'Капитальный ремонт стиральной машины',
    priceFrom: 150000,
    priceTo: 800000,
    currency: 'UZS',
    unit: 'за работу',
    description:
      'Сложные поломки: не сливает, не отжимает, не греет воду, ' +
      'останавливается на середине цикла, протекает. Точная цена — после ' +
      'диагностики. Гарантия до 5 лет.',
    warranty: '6 мес – 5 лет',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%81%D1%82%D0%B8%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D1%85-%D0%BC%D0%B0%D1%88%D0%B8%D0%BD/',
      web: null,
      note:
        'OLX Ташкент: «Цену называю ДО начала работ, диагностика 0 сум, ' +
        'гарантия до 5 лет» (объявления сервис-центров).',
    },
  },
];

// ---------------------------------------------------------------------------
// Категория 3: ХОЛОДИЛЬНИКИ
// ---------------------------------------------------------------------------
const refrigeratorServices = [
  {
    id: 'fr-diagnostic',
    name: 'Диагностика холодильника (выезд)',
    priceFrom: 0,
    priceTo: 50000,
    currency: 'UZS',
    unit: 'за выезд',
    description:
      'Выезд мастера на дом, осмотр, определение поломки. Бесплатно при ' +
      'ремонте; только выезд — 50 000 сум.',
    warranty: '—',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%85%D0%BE%D0%BB%D0%BE%D0%B4%D0%B8%D0%BB%D1%8C%D0%BD%D0%B8%D0%BA%D0%BE%D0%B2/',
      web: null,
      note: 'OLX Ташкент: «Диагностика бесплатная при ремонте, выезд 50 000 сум».',
    },
  },
  {
    id: 'fr-compressor-replace',
    name: 'Замена компрессора холодильника',
    priceFrom: 850000,
    priceTo: 1800000,
    currency: 'UZS',
    unit: 'за работу + запчасть',
    description:
      'Демонтаж старого компрессора, установка нового, перезаправка ' +
      'фреоном, замена фильтра-осушителя, сварка трубок. Цена указана с ' +
      'учётом компрессора — итог зависит от бренда и мощности.',
    warranty: '1 год',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%85%D0%BE%D0%BB%D0%BE%D0%B4%D0%B8%D0%BB%D1%8C%D0%BD%D0%B8%D0%BA%D0%BE%D0%B2/',
      web: 'https://service-eco.uz/holodilnik',
      note:
        'OLX Ташкент: «Замена компрессора — от 850 000 сум, диагностика 0 сум». ' +
        'Верхняя граница — с учётом запчасти для двухкамерных моделей.',
    },
  },
  {
    id: 'fr-freon-refill',
    name: 'Заправка холодильника фреоном',
    priceFrom: 215000,
    priceTo: 400000,
    currency: 'UZS',
    unit: 'за заправку',
    description:
      'Заправка фреоном R134a / R600a / R12 с предварительной ' +
      'вакуумизацией системы и проверкой на утечки.',
    warranty: '1 год',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%85%D0%BE%D0%BB%D0%BE%D0%B4%D0%B8%D0%BB%D1%8C%D0%BD%D0%B8%D0%BA%D0%BE%D0%B2/',
      web: 'https://service-eco.uz/holodilnik',
      note: 'Service-eco.uz: «Заправка холодильника фреоном — от 215 000 сум».',
    },
  },
  {
    id: 'fr-thermostat-replace',
    name: 'Замена терморегулятора / термостата',
    priceFrom: 200000,
    priceTo: 350000,
    currency: 'UZS',
    unit: 'за работу + запчасть',
    description:
      'Замена механического или электронного терморегуля. Цена указана ' +
      'ориентировочно с запчастью — итог зависит от модели.',
    warranty: '1 год',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%85%D0%BE%D0%BB%D0%BE%D0%B4%D0%B8%D0%BB%D1%8C%D0%BD%D0%B8%D0%BA%D0%BE%D0%B2/',
      web: null,
      note: 'OLX Ташкент: «Замена терморегулятора — от 320 руб. (≈320 000 сум)».',
    },
  },
  {
    id: 'fr-nofrost-fuse',
    name: 'Замена плавкого предохранителя (No-Frost)',
    priceFrom: 178000,
    priceTo: null,
    currency: 'UZS',
    unit: 'за работу + запчасть',
    description:
      'Замена плавкого предохранителя в моделях No-Frost (часто причина — ' +
      'нарастание льда и отсутствие оттайки).',
    warranty: '1 год',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%85%D0%BE%D0%BB%D0%BE%D0%B4%D0%B8%D0%BB%D1%8C%D0%BD%D0%B8%D0%BA%D0%BE%D0%B2/',
      web: 'https://service-eco.uz/holodilnik',
      note: 'Service-eco.uz: «Замена плавкого предохранителя — от 178 000 сум».',
    },
  },
  {
    id: 'fr-nofrost-repair',
    name: 'Ремонт системы No-Frost',
    priceFrom: 300000,
    priceTo: 700000,
    currency: 'UZS',
    unit: 'за работу',
    description:
      'Замена ТЭНа оттайки, дефростера, вентилятора испарителя, датчика ' +
      'оттайки. Полный комплекс работ по системе No-Frost.',
    warranty: '6–12 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%85%D0%BE%D0%BB%D0%BE%D0%B4%D0%B8%D0%BB%D1%8C%D0%BD%D0%B8%D0%BA%D0%BE%D0%B2/',
      web: null,
      note: 'OLX Ташкент: «Ремонт No Frost, инвертор» (объявления сервисов).',
    },
  },
  {
    id: 'fr-board-repair',
    name: 'Ремонт платы управления холодильника',
    priceFrom: 250000,
    priceTo: 800000,
    currency: 'UZS',
    unit: 'за услугу',
    description:
      'Ремонт/замена модуля управления инверторных холодильников ' +
      '(Samsung, LG, Bosch). Диагностика электронной платы, замена ' +
      'вышедших из строя элементов.',
    warranty: '6–12 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%85%D0%BE%D0%BB%D0%BE%D0%B4%D0%B8%D0%BB%D1%8C%D0%BD%D0%B8%D0%BA%D0%BE%D0%B2/',
      web: null,
      note: 'OLX Ташкент: «Ремонт инверторных холодильников» (сервисы).',
    },
  },
  {
    id: 'fr-leak-fix',
    name: 'Устранение утечки фреона (пайка трубок)',
    priceFrom: 200000,
    priceTo: 500000,
    currency: 'UZS',
    unit: 'за работу',
    description:
      'Поиск утечки, пайка алюминиевых/медных трубок или замена ' +
      'испарителя, повторная вакуумизация и заправка.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%85%D0%BE%D0%BB%D0%BE%D0%B4%D0%B8%D0%BB%D1%8C%D0%BD%D0%B8%D0%BA%D0%BE%D0%B2/',
      web: null,
      note: 'OLX Ташкент: «Устранение утечки фреона» (сервис-центры).',
    },
  },
];

// ---------------------------------------------------------------------------
// Категория 4: ПОСУДОМОЕЧНЫЕ МАШИНЫ
// ---------------------------------------------------------------------------
const dishwasherServices = [
  {
    id: 'dw-diagnostic',
    name: 'Диагностика посудомоечной машины',
    priceFrom: 0,
    priceTo: 50000,
    currency: 'UZS',
    unit: 'за выезд',
    description:
      'Выезд и осмотр. Бесплатно при ремонте, иначе — выезд 50 000 сум.',
    warranty: '—',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D0%BF%D0%BE%D1%81%D1%83%D0%B4%D0%BE%D0%BC%D0%BE%D0%B5%D1%87%D0%BD%D0%BE%D0%B9/',
      web: 'https://service-centry.uz/samsung/remont-posudomoechnoj-mashiny-samsung',
      note:
        'OLX Ташкент: «посудомоечные машины в Ташкент — объявления ' +
        'сервисных центров». Прайс — по сервисным сайтам из объявлений.',
    },
  },
  {
    id: 'dw-hose-replace',
    name: 'Замена сливного / заливного шланга',
    priceFrom: 110800,
    priceTo: 250000,
    currency: 'UZS',
    unit: 'за работу + запчасть',
    description:
      'Замена заливного или сливного шланга посудомоечной машины. Цена ' +
      'указана с запчастью.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D0%BF%D0%BE%D1%81%D1%83%D0%B4%D0%BE%D0%BC%D0%BE%D0%B5%D1%87%D0%BD%D0%BE%D0%B9/',
      web: 'https://service-centry.uz/samsung/remont-posudomoechnoj-mashiny-samsung',
      note: 'Service-centry.uz: «Замена сливного шланга — 110 800 сум».',
    },
  },
  {
    id: 'dw-pump-replace',
    name: 'Замена сливного насоса (помпы)',
    priceFrom: 180000,
    priceTo: 400000,
    currency: 'UZS',
    unit: 'за работу + запчасть',
    description:
      'Демонтаж старого насоса, установка нового, проверка слива.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D0%BF%D0%BE%D1%81%D1%83%D0%B4%D0%BE%D0%BC%D0%BE%D0%B5%D1%87%D0%BD%D0%BE%D0%B9/',
      web: 'https://service-centry.uz/samsung/remont-posudomoechnoj-mashiny-samsung',
      note:
        'Service-centry.uz (прайс на Samsung): «Замена насоса посудомойки».',
    },
  },
  {
    id: 'dw-heater-replace',
    name: 'Замена ТЭНа посудомоечной машины',
    priceFrom: 200000,
    priceTo: 450000,
    currency: 'UZS',
    unit: 'за работу + запчасть',
    description:
      'Замена нагревательного элемента, проверка нагрева воды.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D0%BF%D0%BE%D1%81%D1%83%D0%B4%D0%BE%D0%BC%D0%BE%D0%B5%D1%87%D0%BD%D0%BE%D0%B9/',
      web: null,
      note: 'OLX Ташкент: «Ремонт посудомоечных машин» (сервис-центры).',
    },
  },
  {
    id: 'dw-ubl-replace',
    name: 'Замена УБЛ (блокировки люка)',
    priceFrom: 90000,
    priceTo: 200000,
    currency: 'UZS',
    unit: 'за работу + запчасть',
    description:
      'Замена устройства блокировки люка, если машинка не запускает цикл.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D0%BF%D0%BE%D1%81%D1%83%D0%B4%D0%BE%D0%BC%D0%BE%D0%B5%D1%87%D0%BD%D0%BE%D0%B9/',
      web: null,
      note:
        'Аналогично стиральным машинам: «Замена УБЛ — от 90 000 сум» ' +
        '(OLX-объявления сервис-центров).',
    },
  },
  {
    id: 'dw-filter-cleaning',
    name: 'Чистка фильтров заливного шланга и сливного насоса',
    priceFrom: 90000,
    priceTo: 150000,
    currency: 'UZS',
    unit: 'за услугу',
    description:
      'Разборка и чистка фильтров посудомоечной машины от накипи и ' +
      'загрязнений.',
    warranty: '—',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D0%BF%D0%BE%D1%81%D1%83%D0%B4%D0%BE%D0%BC%D0%BE%D0%B5%D1%87%D0%BD%D0%BE%D0%B9/',
      web: null,
      note: 'OLX Ташкент: «Чистка фильтров посудомоечной машины» (сервисы).',
    },
  },
];

// ---------------------------------------------------------------------------
// Категория 5: ТЕЛЕВИЗОРЫ
// ---------------------------------------------------------------------------
const tvServices = [
  {
    id: 'tv-diagnostic',
    name: 'Диагностика телевизора',
    priceFrom: 0,
    priceTo: 50000,
    currency: 'UZS',
    unit: 'за выезд',
    description:
      'Выезд мастера, осмотр, определение причины неисправности. ' +
      'Бесплатно при последующем ремонте.',
    warranty: '—',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80%D0%BE%D0%B2/',
      web: null,
      note: 'OLX Ташкент: «Диагностика бесплатно при ремонте» (сервисы).',
    },
  },
  {
    id: 'tv-backlight-replace',
    name: 'Замена подсветки (LED-стринги)',
    priceFrom: 250000,
    priceTo: 600000,
    currency: 'UZS',
    unit: 'за работу + запчасть',
    description:
      'Разборка матрицы, замена светодиодных лент подсветки. Самая частая ' +
      'поломка современных LED-телевизоров (есть звук, нет изображения).',
    warranty: '6–12 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80%D0%BE%D0%B2/',
      web: 'https://service-eco.uz/tv/backlight',
      note:
        'OLX Ташкент: «Ремонт телевизоров замена подсветки, плат, шлейфов». ' +
        'Service-eco.uz: «Замена подсветки — выезд за счёт сервиса».',
    },
  },
  {
    id: 'tv-matrix-replace',
    name: 'Замена матрицы телевизора',
    priceFrom: 600000,
    priceTo: 3500000,
    currency: 'UZS',
    unit: 'за работу + запчасть',
    description:
      'Замена разбитой или неисправной матрицы. Цена — 60–80% от стоимости ' +
      'нового телевизора; иногда экономически нецелесообразна.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80%D0%BE%D0%B2/',
      web: null,
      note:
        'OLX Ташкент: «Замена матрицы телевизора в Ташкенте — обычно ' +
        '60–80% его стоимости».',
    },
  },
  {
    id: 'tv-board-repair',
    name: 'Ремонт / замена плат (блока питания, инвертора, main)',
    priceFrom: 200000,
    priceTo: 700000,
    currency: 'UZS',
    unit: 'за работу',
    description:
      'Ремонт или замена блоков: power supply, main board, T-CON. ' +
      'Пропайка, замена конденсаторов, контроллеров.',
    warranty: '6–12 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80%D0%BE%D0%B2/',
      web: null,
      note: 'OLX Ташкент: «Ремонт плат, шлейфов телевизоров» (сервисы).',
    },
  },
  {
    id: 'tv-cable-replace',
    name: 'Замена шлейфов / кабелей матрицы',
    priceFrom: 80000,
    priceTo: 250000,
    currency: 'UZS',
    unit: 'за работу + запчасть',
    description:
      'Замена шлейфов LVDS/T-CON, контактных групп. Помогает при ' +
      'искажённом изображении, полосах на экране.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%82%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%B7%D0%BE%D1%80%D0%BE%D0%B2/',
      web: null,
      note: 'OLX Ташкент: «Замена шлейфов» (объявления сервис-центров).',
    },
  },
];

// ---------------------------------------------------------------------------
// Категория 6: ГАЗОВЫЕ И ЭЛЕКТРИЧЕСКИЕ ПЛИТЫ
// ---------------------------------------------------------------------------
const stoveServices = [
  {
    id: 'st-diagnostic',
    name: 'Диагностика газовой / электроплиты',
    priceFrom: 0,
    priceTo: 50000,
    currency: 'UZS',
    unit: 'за выезд',
    description:
      'Выезд мастера, осмотр. Бесплатно при ремонте, иначе 50 000 сум.',
    warranty: '—',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D0%BF%D0%BB%D0%B8%D1%82%D1%8B-%D0%BF%D0%B5%D1%87/',
      web: 'https://tech.ustabor.uz/ru/price/gas_stoves',
      note:
        'OLX Ташкент: «плиты печ — объявления сервисных центров». ' +
        'tech.ustabor.uz: «ремонт газовых плит в среднем 20–250 тыс. сум».',
    },
  },
  {
    id: 'st-burner-replace',
    name: 'Замена конфорки / горелки',
    priceFrom: 20000,
    priceTo: 250000,
    currency: 'UZS',
    unit: 'за работу + запчасть',
    description:
      'Замена газовой горелки или электрической конфорки/ТЭНа. Цена ' +
      'зависит от модели плиты и типа запчасти.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D0%BF%D0%BB%D0%B8%D1%82%D1%8B-%D0%BF%D0%B5%D1%87/',
      web: 'https://tech.ustabor.uz/ru/price/gas_stoves',
      note:
        'tech.ustabor.uz: «ремонт газовых плит 20–250 тыс. сум (зависит ' +
        'от запчастей и модели)».',
    },
  },
  {
    id: 'st-ignition-replace',
    name: 'Замена электроподжига / термопары',
    priceFrom: 80000,
    priceTo: 200000,
    currency: 'UZS',
    unit: 'за работу + запчасть',
    description:
      'Замена блока электроподжига, кнопок пьезо, термопары. Решает ' +
      'пробему «гаснет конфорка после отпускания ручки».',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D0%BF%D0%BB%D0%B8%D1%82%D1%8B-%D0%BF%D0%B5%D1%87/',
      web: null,
      note: 'OLX Ташкент: «Ремонт газовых плит на дому» (сервис-центры).',
    },
  },
  {
    id: 'st-gas-valve-replace',
    name: 'Замена газового крана / клапана',
    priceFrom: 100000,
    priceTo: 300000,
    currency: 'UZS',
    unit: 'за работу + запчасть',
    description:
      'Замена газового крана конфорки или клапана безопасности.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D0%BF%D0%BB%D0%B8%D1%82%D1%8B-%D0%BF%D0%B5%D1%87/',
      web: null,
      note: 'OLX Ташкент: «Ремонт газовых плит» (объявления сервисов).',
    },
  },
  {
    id: 'st-install',
    name: 'Установка и подключение плиты',
    priceFrom: 150000,
    priceTo: 350000,
    currency: 'UZS',
    unit: 'за установку',
    description:
      'Подключение к газу или электросети, выравнивание, проверка всех ' +
      'конфорок, инструктаж.',
    warranty: '1 год',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D0%BF%D0%BB%D0%B8%D1%82%D1%8B-%D0%BF%D0%B5%D1%87/',
      web: 'https://tech.ustabor.uz/ru/price/gas_stoves',
      note: 'tech.ustabor.uz: «установка газовых плит» (прайс).',
    },
  },
];

// ---------------------------------------------------------------------------
// Категория 7: МИКРОВОЛНОВЫЕ ПЕЧИ (СВЧ)
// ---------------------------------------------------------------------------
const microwaveServices = [
  {
    id: 'mw-diagnostic',
    name: 'Диагностика микроволновой печи',
    priceFrom: 0,
    priceTo: 50000,
    currency: 'UZS',
    unit: 'за выезд',
    description:
      'Выезд мастера на дом в день обращения, осмотр, определение ' +
      'поломки. Бесплатно при ремонте.',
    warranty: '—',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D0%BC%D0%B8%D0%BA%D1%80%D0%BE%D0%B2%D0%BE%D0%BB%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0/',
      web: null,
      note: 'OLX Ташкент: «Ремонт микроволновых СВЧ печей» (сервис-центры).',
    },
  },
  {
    id: 'mw-general-repair',
    name: 'Ремонт микроволновой печи (общий)',
    priceFrom: 100000,
    priceTo: 500000,
    currency: 'UZS',
    unit: 'за работу',
    description:
      'Диагностика, честная смета, гарантия. Самые частые поломки: ' +
      'не греет, искрит, не включается, шумит.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D0%BC%D0%B8%D0%BA%D1%80%D0%BE%D0%B2%D0%BE%D0%BB%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0/',
      web: null,
      note: 'OLX Ташкент: «Ремонт микроволновых печей на дому — от 100 000 сум».',
    },
  },
  {
    id: 'mw-magnetron-replace',
    name: 'Замена магнетрона',
    priceFrom: 250000,
    priceTo: 600000,
    currency: 'UZS',
    unit: 'за работу + запчасть',
    description:
      'Замена магнетрона — главной детали СВЧ-печи, генерирующей ' +
      'микроволны. Цена с запчастью.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D0%BC%D0%B8%D0%BA%D1%80%D0%BE%D0%B2%D0%BE%D0%BB%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0/',
      web: null,
      note: 'OLX Ташкент: «Ремонт микроволновых СВЧ» (прайс сервисов).',
    },
  },
  {
    id: 'mw-transformer-replace',
    name: 'Замена высоковольтного трансформатора',
    priceFrom: 200000,
    priceTo: 500000,
    currency: 'UZS',
    unit: 'за работу + запчасть',
    description:
      'Замена ВВ-трансформатора. Цена договорная, зависит от модели.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D0%BC%D0%B8%D0%BA%D1%80%D0%BE%D0%B2%D0%BE%D0%BB%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0/',
      web: null,
      note: 'OLX Ташкент: «Замена ВВ трансформатора — договорная».',
    },
  },
  {
    id: 'mw-diode-capacitor',
    name: 'Замена высоковольтного диода / конденсатора',
    priceFrom: 80000,
    priceTo: 250000,
    currency: 'UZS',
    unit: 'за работу + запчасть',
    description:
      'Замена ВВ-диода, конденсатора, предохранителя. Устраняет гудение ' +
      'и отсутствие нагрева.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D0%BC%D0%B8%D0%BA%D1%80%D0%BE%D0%B2%D0%BE%D0%BB%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0/',
      web: null,
      note: 'OLX Ташкент: «Замена ВВ диода» (объявления сервисов).',
    },
  },
  {
    id: 'mw-mica-replace',
    name: 'Замена слюдяной пластины',
    priceFrom: 50000,
    priceTo: 100000,
    currency: 'UZS',
    unit: 'за работу + запчасть',
    description:
      'Замена слюдяной крышки волновода. Помогает при искрении внутри ' +
      'камеры.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D0%BC%D0%B8%D0%BA%D1%80%D0%BE%D0%B2%D0%BE%D0%BB%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0/',
      web: null,
      note: 'OLX Ташкент: «Замена слюды» (сервис-центры).',
    },
  },
];

// ---------------------------------------------------------------------------
// Категория 8: МУЖ НА ЧАС / ОБЩАЯ БЫТОВАЯ ТЕХНИКА
// ---------------------------------------------------------------------------
const handymanServices = [
  {
    id: 'hm-handyman-hour',
    name: 'Муж на час — домашний мастер',
    priceFrom: 50000,
    priceTo: 150000,
    currency: 'UZS',
    unit: 'за час / выезд',
    description:
      'Мелкий бытовой ремонт: сборка мебели, монтаж полок, замена замков, ' +
      'ремонт смесителей, замена розеток, мелкая электрика, сантехника.',
    warranty: '—',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://m.olx.uz/uslugi/tashkent/q-%D1%83%D1%81%D0%BB%D1%83%D0%B3%D0%B8-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D0%B1%D1%8B%D1%82%D0%BE%D0%B2%D0%BE%D0%B9-%D1%82%D0%B5%D1%85%D0%BD%D0%B8%D0%BA%D0%B8/',
      web: null,
      note: 'OLX Ташкент: «Муж на час. Домашний мастер на все руки».',
    },
  },
  {
    id: 'hm-faucet-replace',
    name: 'Замена смесителя / сантехники',
    priceFrom: 80000,
    priceTo: 250000,
    currency: 'UZS',
    unit: 'за работу',
    description:
      'Замена смесителя на кухне и в ванной, ремонт протечек, замена ' +
      'сифона, подключение бытовой техники к воде.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://m.olx.uz/uslugi/tashkent/q-%D1%83%D1%81%D0%BB%D1%83%D0%B3%D0%B8-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D0%B1%D1%8B%D1%82%D0%BE%D0%B2%D0%BE%D0%B9-%D1%82%D0%B5%D1%85%D0%BD%D0%B8%D0%BA%D0%B8/',
      web: null,
      note: 'OLX Ташкент: «Бытовые услуги» (категория объявлений).',
    },
  },
  {
    id: 'hm-outlet-replace',
    name: 'Замена розеток / выключателей / мелкая электрика',
    priceFrom: 50000,
    priceTo: 200000,
    currency: 'UZS',
    unit: 'за точку',
    description:
      'Замена розеток, выключателей, ремонт проводки, подключение ' +
      'бытовых приборов к электросети.',
    warranty: '6 мес',
    district: TASHKENT_DISTRICTS,
    source: {
      olx: 'https://m.olx.uz/uslugi/tashkent/q-%D1%83%D1%81%D0%BB%D1%83%D0%B3%D0%B8-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D0%B1%D1%8B%D1%82%D0%BE%D0%B2%D0%BE%D0%B9-%D1%82%D0%B5%D1%85%D0%BD%D0%B8%D0%BA%D0%B8/',
      web: null,
      note: 'OLX Ташкент: «Бытовые услуги» (категория объявлений).',
    },
  },
];

// ---------------------------------------------------------------------------
// ПРОФИЛИ МАСТЕРОВ И СЕРВИСНЫХ ЦЕНТРОВ
// -----------------------------------------------------------------------------
// Каждый мастер/сервис — это объявление на OLX.uz (Ташкент), из которого взяты
// цены на услуги. В профиле: специализация, районы выезда, услуги с ценами
// (slug услуги из категорий выше) и прямая ссылка на профиль/объявление OLX.
//
// Контакты (телефон, имя) не публикуются публично на OLX в сниппете и
// открываются только после перехода на страницу объявления — поэтому в базе
// указан только URL профиля мастера на OLX. В React-приложении можно
// рендерить кнопку «Показать телефон» со ссылкой на source.url.
// ---------------------------------------------------------------------------
export const masters = [
  // --- КОНДИЦИОНЕРЫ ---
  {
    id: 'master-ac-cleaner',
    name: 'Мастер по ремонту и обслуживанию кондиционеров (чистка/заправка)',
    type: 'Частный мастер',
    specialization: ['Кондиционеры'],
    districts: TASHKENT_DISTRICTS,
    rating: null,
    experienceYears: '5+',
    responseTime: '1–2 часа',
    serviceIds: [
      'ac-cleaning-full',
      'ac-freon-refill',
      'ac-repair-general',
      'ac-prevention',
    ],
    url: 'https://m.olx.uz/d/obyavlenie/master-po-remontu-i-obsluzhivaniyu-konditsionerov-tashkent-chistka-zapra-ID4lbKx.html',
    olxListingId: 'ID4lbKx',
    note:
      'OLX Ташкент. Прайс-лист прямо в объявлении: чистка 150 000 сум, ' +
      'заправка фреоном 150 000 сум, ремонт от 200 000 сум, профилактика ' +
      'от 120 000 сум. Гарантия 6–12 мес, выезд в любой район.',
  },
  {
    id: 'master-ac-install-mirzo',
    name: 'Установка и ремонт кондиционеров (мастерская в Мирзо-Улугбеке)',
    type: 'Сервисный центр',
    specialization: ['Кондиционеры'],
    districts: ['Мирзо-Улугбекский', 'Янгиюль', 'Ташкентская обл.'],
    rating: null,
    experienceYears: '7+',
    responseTime: 'день обращения',
    serviceIds: [
      'ac-install-standard',
      'ac-install-highrise',
      'ac-dismantle',
      'ac-freon-refill',
      'ac-cleaning-full',
      'ac-leak-fix',
    ],
    url: 'https://m.olx.uz/d/obyavlenie/ustanovka-i-remont-kondicionerov-mast-ID4rdKD.html',
    olxListingId: 'ID4rdKD',
    note:
      'OLX Ташкент. Установка любых марок, заправка фреоном, диагностика, ' +
      'чистка/профилактика, ремонт внутреннего и наружного блока, ' +
      'вакуумирование, проверка утечек. Гарантия на работы, выезд ежедневно.',
  },
  {
    id: 'master-ac-serviceplus',
    name: 'ServicePlus — установка кондиционеров',
    type: 'Сервисный центр',
    specialization: ['Кондиционеры'],
    districts: TASHKENT_DISTRICTS,
    rating: null,
    experienceYears: '7+',
    responseTime: '30 минут',
    serviceIds: ['ac-install-standard', 'ac-freon-refill', 'ac-cleaning-full'],
    url: 'https://serviceplus.uz/ustanovka',
    olxListingId: null,
    note:
      'Найден через OLX Ташкент. Установка от 450 000 сум, заправка фреона ' +
      'от 380 000 сум, чистка от 300 000 сум. Выезд 30 минут.',
  },
  {
    id: 'master-ac-eco',
    name: 'Eco-Service — ремонт кондиционеров и климатической техники',
    type: 'Сервисный центр',
    specialization: ['Кондиционеры', 'Холодильники'],
    districts: TASHKENT_DISTRICTS,
    rating: null,
    experienceYears: '7+',
    responseTime: '30 минут',
    serviceIds: ['ac-cleaning-full', 'ac-repair-general', 'fr-compressor-replace'],
    url: 'https://service-eco.uz/',
    olxListingId: null,
    note:
      'Рекламируется через OLX. Прайс на сайте. Опыт мастеров от 7 лет, ' +
      'выезд и диагностика — за счёт сервиса, гарантия 1 год.',
  },

  // --- СТИРАЛЬНЫЕ МАШИНЫ ---
  {
    id: 'master-wm-andrey',
    name: 'Андрей — ремонт стиральных машин',
    type: 'Частный мастер',
    specialization: ['Стиральные машины'],
    districts: ['Чиланзарский', 'Алмазарский', 'Мирабадский'],
    rating: null,
    experienceYears: '7+',
    responseTime: 'день обращения',
    serviceIds: [
      'wm-diagnostic',
      'wm-general-repair',
      'wm-bearing-replace',
      'wm-board-repair',
    ],
    url: 'https://www.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D1%81%D1%82%D0%B8%D1%80%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D1%85-%D0%BC%D0%B0%D1%88%D0%B8%D0%BD/',
    olxListingId: null,
    note:
      'OLX Ташкент: «Андрей Ремонт стиральных машин. Выезд и гарантия 6 мес». ' +
      'Активные объявления в Чиланзарском, Алмазарском и Мирабадском районах.',
  },
  {
    id: 'master-wm-callout',
    name: 'Мастерская — ремонт стиральных машин на дому, выезд',
    type: 'Сервисный центр',
    specialization: ['Стиральные машины'],
    districts: TASHKENT_DISTRICTS,
    rating: null,
    experienceYears: '5+',
    responseTime: '1 час',
    serviceIds: [
      'wm-diagnostic',
      'wm-install',
      'wm-general-repair',
      'wm-heater-replace',
      'wm-pump-replace',
      'wm-motor-replace',
      'wm-ubl-replace',
    ],
    url: 'https://m.olx.uz/d/obyavlenie/remont-stiralnyh-mashin-v-tashkente-vyezd-mastera-na-dom-ID4t1kP.html',
    olxListingId: 'ID4t1kP',
    note:
      'OLX Ташкент. Цену называю ДО начала работ, диагностика 0 сум при ' +
      'ремонте, при отказе — выезд 50 000 сум. Гарантия до 5 лет.',
  },
  {
    id: 'master-wm-serjozha',
    name: 'Серёжа — ремонт стиральных машин и стиралок, выезд',
    type: 'Частный мастер',
    specialization: ['Стиральные машины'],
    districts: TASHKENT_DISTRICTS,
    rating: null,
    experienceYears: '5+',
    responseTime: 'день обращения',
    serviceIds: [
      'wm-diagnostic',
      'wm-general-repair',
      'wm-bearing-replace',
      'wm-pump-replace',
    ],
    url: 'https://www.olx.uz/d/obyavlenie/serezha-remont-stiralnyh-mashin-remont-stiralok-vyezd-ID4uXde.html',
    olxListingId: 'ID4uXde',
    note: 'OLX Ташкент: ремонт стиральных машин с выездом на дом.',
  },
  {
    id: 'master-wm-eco',
    name: 'Eco-Service — ремонт стиральных машин',
    type: 'Сервисный центр',
    specialization: ['Стиральные машины'],
    districts: TASHKENT_DISTRICTS,
    rating: null,
    experienceYears: '7+',
    responseTime: '30 минут',
    serviceIds: [
      'wm-diagnostic',
      'wm-install',
      'wm-bearing-replace',
      'wm-drum-repair',
      'wm-board-repair',
    ],
    url: 'https://service-eco.uz/washer',
    olxListingId: null,
    note:
      'Найден через OLX. Прайс-лист на сайте: установка от 87 000 сум, ' +
      'замена подшипника от 45 000 сум, ремонт барабана от 42 000 сум.',
  },

  // --- ХОЛОДИЛЬНИКИ ---
  {
    id: 'master-fr-callout',
    name: 'Ремонт холодильников срочно — выезд мастера',
    type: 'Сервисный центр',
    specialization: ['Холодильники', 'Морозильники'],
    districts: TASHKENT_DISTRICTS,
    rating: null,
    experienceYears: '5+',
    responseTime: 'день обращения',
    serviceIds: [
      'fr-diagnostic',
      'fr-compressor-replace',
      'fr-freon-refill',
      'fr-nofrost-repair',
      'fr-leak-fix',
    ],
    url: 'https://m.olx.uz/d/obyavlenie/remont-holodilnikov-srochno-master-na-vyezd-ID3oBIT.html',
    olxListingId: 'ID3oBIT',
    note:
      'OLX Ташкент. Цены на 20–30% ниже рыночных, диагностика бесплатная ' +
      'при ремонте, выезд на дом, мастер всегда с запчастями.',
  },
  {
    id: 'master-fr-nofrost-ruslan',
    name: 'Ремонт холодильников No Frost / инвертор — Руслан',
    type: 'Частный мастер',
    specialization: ['Холодильники'],
    districts: TASHKENT_DISTRICTS,
    rating: null,
    experienceYears: '7+',
    responseTime: '1–2 часа',
    serviceIds: [
      'fr-nofrost-repair',
      'fr-nofrost-fuse',
      'fr-board-repair',
      'fr-compressor-replace',
      'fr-freon-refill',
    ],
    url: 'https://m.olx.uz/d/obyavlenie/remont-holodilnikov-remont-xolodilnik-no-frost-inverter-ruslan-ID4wePp.html',
    olxListingId: 'ID4wePp',
    note:
      'OLX Ташкент. Специализация: инверторные холодильники и система ' +
      'No Frost (Samsung, LG, Bosch). Замена компрессора, заправка фреоном.',
  },
  {
    id: 'master-fr-rinat',
    name: 'Ремонт холодильников с выездом — Ринат',
    type: 'Частный мастер',
    specialization: ['Холодильники'],
    districts: TASHKENT_DISTRICTS,
    rating: null,
    experienceYears: '5+',
    responseTime: '1 час',
    serviceIds: [
      'fr-diagnostic',
      'fr-compressor-replace',
      'fr-freon-refill',
      'fr-thermostat-replace',
      'fr-nofrost-repair',
    ],
    url: 'https://www.olx.uz/d/obyavlenie/remont-holodilnikov-s-vyezdom-remont-xolodilnik-usta-rinat-ID4u7u8.html',
    olxListingId: 'ID4u7u8',
    note: 'OLX Ташкент: «Remont xolodilnik usta Rinat» — выезд по городу.',
  },
  {
    id: 'master-fr-247',
    name: 'Remont muzlatgich — ремонт холодильников 24/7',
    type: 'Сервисный центр',
    specialization: ['Холодильники'],
    districts: ['Сергелийский', 'Яккасарайский'],
    rating: null,
    experienceYears: '7+',
    responseTime: 'круглосуточно',
    serviceIds: [
      'fr-diagnostic',
      'fr-compressor-replace',
      'fr-freon-refill',
      'fr-nofrost-repair',
    ],
    url: 'https://m.olx.uz/uslugi/tashkent/q-%D1%83%D1%81%D0%BB%D1%83%D0%B3%D0%B8-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D0%B1%D1%8B%D1%82%D0%BE%D0%B2%D0%BE%D0%B9-%D1%82%D0%B5%D1%85%D0%BD%D0%B8%D0%BA%D0%B8/',
    olxListingId: null,
    note: 'OLX Ташкент: «Remont muzlatgich | Ремонт холодильников 24/7».',
  },

  // --- ПОСУДОМОЕЧНЫЕ МАШИНЫ ---
  {
    id: 'master-dw-samsung',
    name: 'Ремонт посудомоечных машин Samsung',
    type: 'Сервисный центр',
    specialization: ['Посудомоечные машины'],
    districts: TASHKENT_DISTRICTS,
    rating: null,
    experienceYears: '7+',
    responseTime: '1–2 часа',
    serviceIds: [
      'dw-diagnostic',
      'dw-hose-replace',
      'dw-pump-replace',
      'dw-ubl-replace',
      'dw-filter-cleaning',
    ],
    url: 'https://service-centry.uz/samsung/remont-posudomoechnoj-mashiny-samsung',
    olxListingId: null,
    note:
      'Найден через OLX. Прайс: замена сливного шланга 110 800 сум. ' +
      'Специализация на технике Samsung.',
  },

  // --- ТЕЛЕВИЗОРЫ ---
  {
    id: 'master-tv-callout',
    name: 'Ремонт телевизоров — замена матрицы / подсветки',
    type: 'Сервисный центр',
    specialization: ['Телевизоры'],
    districts: TASHKENT_DISTRICTS,
    rating: null,
    experienceYears: '7+',
    responseTime: '1 час',
    serviceIds: [
      'tv-diagnostic',
      'tv-backlight-replace',
      'tv-matrix-replace',
      'tv-board-repair',
      'tv-cable-replace',
    ],
    url: 'https://www.olx.uz/d/obyavlenie/remont-televizorov-ID3UJ9T.html',
    olxListingId: 'ID3UJ9T',
    note:
      'OLX Ташкент: «Ремонт телевизоров замена экранов, подсветки, плат, ' +
      'шлейфов». Режим работы 9:00–19:00.',
  },
  {
    id: 'master-tv-matrix',
    name: 'Замена матрицы телевизора — выезд 30 минут',
    type: 'Сервисный центр',
    specialization: ['Телевизоры'],
    districts: TASHKENT_DISTRICTS,
    rating: null,
    experienceYears: '7+',
    responseTime: '30 минут',
    serviceIds: ['tv-diagnostic', 'tv-matrix-replace', 'tv-board-repair'],
    url: 'https://m.olx.uz/uslugi/tashkent/q-%D0%B7%D0%B0%D0%BC%D0%B5%D0%BD%D0%B0-%D0%BC%D0%B0%D1%82%D1%80%D0%B8%D1%86%D1%8B/',
    olxListingId: null,
    note:
      'OLX Ташкент: «Замена матрицы телевизора в Ташкенте — обычно 60–80% ' +
      'его стоимости». Диагностика бесплатна при ремонте.',
  },
  {
    id: 'master-tv-eco',
    name: 'Eco-Service — замена подсветки телевизоров',
    type: 'Сервисный центр',
    specialization: ['Телевизоры'],
    districts: TASHKENT_DISTRICTS,
    rating: null,
    experienceYears: '7+',
    responseTime: '30 минут',
    serviceIds: ['tv-diagnostic', 'tv-backlight-replace', 'tv-board-repair'],
    url: 'https://service-eco.uz/tv/backlight',
    olxListingId: null,
    note: 'Найден через OLX. Замена и ремонт подсветки, выезд за счёт сервиса.',
  },

  // --- ГАЗОВЫЕ И ЭЛЕКТРИЧЕСКИЕ ПЛИТЫ ---
  {
    id: 'master-st-ustabor',
    name: 'Ustabor — ремонт и установка газовых плит',
    type: 'Сервисный центр',
    specialization: ['Газовые и электроплиты'],
    districts: TASHKENT_DISTRICTS,
    rating: null,
    experienceYears: '5+',
    responseTime: '1–2 часа',
    serviceIds: [
      'st-diagnostic',
      'st-burner-replace',
      'st-ignition-replace',
      'st-gas-valve-replace',
      'st-install',
    ],
    url: 'https://tech.ustabor.uz/ru/price/gas_stoves',
    olxListingId: null,
    note:
      'Найден через OLX. Ремонт газовых плит в среднем 20–250 тыс. сум ' +
      '(зависит от запчастей и модели).',
  },

  // --- МИКРОВОЛНОВЫЕ ПЕЧИ ---
  {
    id: 'master-mw-callout',
    name: 'Ремонт микроволновых печей на дому — выезд в день обращения',
    type: 'Сервисный центр',
    specialization: ['Микроволновые печи'],
    districts: TASHKENT_DISTRICTS,
    rating: null,
    experienceYears: '5+',
    responseTime: 'день обращения',
    serviceIds: [
      'mw-diagnostic',
      'mw-general-repair',
      'mw-magnetron-replace',
      'mw-transformer-replace',
      'mw-diode-capacitor',
      'mw-mica-replace',
    ],
    url: 'https://m.olx.uz/uslugi/obsluzhivanie-remont-tehniki/tashkent/q-%D0%BC%D0%B8%D0%BA%D1%80%D0%BE%D0%B2%D0%BE%D0%BB%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0/',
    olxListingId: null,
    note:
      'OLX Ташкент: «Ремонт микроволновых печей на дому — от 100 000 сум». ' +
      'Диагностика, честная смета, гарантия.',
  },

  // --- МУЖ НА ЧАС / БЫТОВЫЕ УСЛУГИ ---
  {
    id: 'master-hm-allhands',
    name: 'Муж на час — домашний мастер на все руки',
    type: 'Частный мастер',
    specialization: ['Бытовые услуги'],
    districts: TASHKENT_DISTRICTS,
    rating: null,
    experienceYears: '5+',
    responseTime: '1–2 часа',
    serviceIds: [
      'hm-handyman-hour',
      'hm-faucet-replace',
      'hm-outlet-replace',
    ],
    url: 'https://m.olx.uz/uslugi/tashkent/q-%D1%83%D1%81%D0%BB%D1%83%D0%B3%D0%B8-%D1%80%D0%B5%D0%BC%D0%BE%D0%BD%D1%82-%D0%B1%D1%8B%D1%82%D0%BE%D0%B2%D0%BE%D0%B9-%D1%82%D0%B5%D1%85%D0%BD%D0%B8%D0%BA%D0%B8/',
    olxListingId: null,
    note:
      'OLX Ташкент: «Муж на час. Домашний мастер на все руки, отремонтирую ' +
      'ВС…». Мелкий бытовой ремонт, сборка мебели, сантехника, электрика.',
  },
];

// ---------------------------------------------------------------------------
// ПРОВЕРЕННЫЕ МАСТЕРА (3 конкретных человека с реальными контактами)
// -----------------------------------------------------------------------------
// Данные получены напрямую с OLX.uz (Ташкент) 2026-11-18:
//   - имя из поля user.name
//   - телефон из официального API OLX /api/v1/offers/{adId}/phones
//   - ссылка на само объявление OLX
// Эти люди реально работают по своим услугам на момент сбора базы.
// ---------------------------------------------------------------------------
export const verifiedMasters = [
  {
    id: 'verified-1-ac',
    name: 'Fjd',
    realNameNote:
      'Имя профиля на OLX — «Fjd» (полное имя мастер не публикует, ' +
      'указывает только профиль). Это частный мастер по кондиционерам.',
    service: 'Ремонт, чистка и заправка кондиционеров',
    specialization: ['Кондиционеры'],
    districts: ['Мирзо-Улугбекский'],
    experienceYears: '8+',
    responseTime: '1–2 часа',
    phone: '+998935859588',
    phoneDisplay: '+998 93 585 95 88',
    olxAdId: 64155401,
    olxListingId: 'ID4lbKx',
    url: 'https://m.olx.uz/d/obyavlenie/master-po-remontu-i-obsluzhivaniyu-konditsionerov-tashkent-chistka-zapra-ID4lbKx.html',
    prices: [
      { service: 'Чистка кондиционера (полная)', priceFrom: 150000 },
      { service: 'Заправка фреоном', priceFrom: 150000 },
      { service: 'Ремонт (после диагностики)', priceFrom: 200000 },
      { service: 'Профилактика и обслуживание', priceFrom: 120000 },
    ],
    serviceIds: ['ac-cleaning-full', 'ac-freon-refill', 'ac-repair-general', 'ac-prevention'],
    note:
      'Из объявления: «Профессиональный мастер по кондиционерам в Ташкенте. ' +
      'Опыт более 8 лет. Работаю со всеми брендами: LG, Samsung, Gree, Haier, ' +
      'Daikin, Toshiba. Выезд в любой район 1–2 часа, гарантия 6–12 мес».',
    verifiedAt: '2026-11-18',
    source: 'OLX.uz /api/v1/offers/64155401/phones',
  },
  {
    id: 'verified-2-wm',
    name: 'Серёжа',
    realNameNote:
      'Имя профиля на OLX — «Серёжа» / «Сережа». Частный мастер по ' +
      'ремонту стиральных машин, работает на дому и у офисов 24/7.',
    service: 'Ремонт стиральных машин на дому и офисам 24/7',
    specialization: ['Стиральные машины'],
    districts: ['Чиланзарский'],
    experienceYears: '5+',
    responseTime: 'день обращения (24/7)',
    phone: '+998931964272',
    phoneDisplay: '+998 93 196 42 72',
    olxAdId: 66557504,
    olxListingId: 'ID4wgE8',
    url: 'https://m.olx.uz/d/obyavlenie/serezha-remont-stiralnyh-mashin-na-domu-i-ofisam-24-7-ID4wgE8.html',
    prices: [
      { service: 'Диагностика (выезд)', priceFrom: 0, priceTo: 50000 },
      { service: 'Капитальный ремонт', priceFrom: 150000, priceTo: 800000 },
    ],
    serviceIds: ['wm-diagnostic', 'wm-general-repair', 'wm-bearing-replace', 'wm-pump-replace'],
    note:
      'OLX Ташкент, Чиланзарский район. Ремонт стиральных машин на дому и ' +
      'офисам круглосуточно. В тексте объявления — выезд и гарантия 6 мес.',
    verifiedAt: '2026-11-18',
    source: 'OLX.uz /api/v1/offers/66557504/phones',
  },
  {
    id: 'verified-3-fr',
    name: 'Master Usta',
    realNameNote:
      'Имя профиля на OLX — «Master Usta» (букв. «мастер-учитель»). ' +
      'Узбекскоязычный мастер по ремонту холодильников и морозильников.',
    service: 'Ремонт холодильников и морозильников (музлатгич тамирлаш)',
    specialization: ['Холодильники', 'Морозильники'],
    districts: ['Юнусабадский'],
    experienceYears: '5+',
    responseTime: '1–2 часа',
    phone: '+998977332283',
    phoneDisplay: '+998 97 733 22 83',
    olxAdId: 64530030,
    olxListingId: 'ID4mLcV',
    url: 'https://m.olx.uz/d/obyavlenie/remont-holodilnikov-holodilnik-holodilnik-muzlatgich-tamirlash-usta-ID4mLcV.html',
    prices: [
      { service: 'Диагностика (выезд)', priceFrom: 0, priceTo: 50000 },
      { service: 'Замена компрессора', priceFrom: 850000 },
      { service: 'Заправка фреоном', priceFrom: 215000 },
      { service: 'Ремонт No-Frost', priceFrom: 300000 },
    ],
    serviceIds: [
      'fr-diagnostic',
      'fr-compressor-replace',
      'fr-freon-refill',
      'fr-nofrost-repair',
      'fr-leak-fix',
    ],
    note:
      'OLX Ташкент, Юнусабадский район. Ремонт холодильников всех марок, ' +
      'морозильников (музлатгич тамирлаш). Бренды: Samsung, LG, Bosch, ' +
      'Ariston, Beko и др.',
    verifiedAt: '2026-11-18',
    source: 'OLX.uz /api/v1/offers/64530030/phones',
  },
];

// ---------------------------------------------------------------------------
// Сводная структура категорий
// ---------------------------------------------------------------------------
export const categories = [
  {
    id: 'air-conditioners',
    title: 'Кондиционеры',
    icon: '❄️',
    services: airConditionerServices,
  },
  {
    id: 'washing-machines',
    title: 'Стиральные машины',
    icon: '🌀',
    services: washingMachineServices,
  },
  {
    id: 'refrigerators',
    title: 'Холодильники',
    icon: '🧊',
    services: refrigeratorServices,
  },
  {
    id: 'dishwashers',
    title: 'Посудомоечные машины',
    icon: '🍽️',
    services: dishwasherServices,
  },
  {
    id: 'tvs',
    title: 'Телевизоры',
    icon: '📺',
    services: tvServices,
  },
  {
    id: 'stoves',
    title: 'Газовые и электроплиты',
    icon: '🔥',
    services: stoveServices,
  },
  {
    id: 'microwaves',
    title: 'Микроволновые печи (СВЧ)',
    icon: '📡',
    services: microwaveServices,
  },
  {
    id: 'handyman',
    title: 'Муж на час / Бытовые услуги',
    icon: '🧰',
    services: handymanServices,
  },
];

// ---------------------------------------------------------------------------
// Главная экспортируемая база
// ---------------------------------------------------------------------------
export const servicesDatabase = {
  meta: META,
  districts: TASHKENT_DISTRICTS,
  categories,
  masters,
  verifiedMasters,
};

// ---------------------------------------------------------------------------
// Вспомогательные функции для использования в React-компонентах
// ---------------------------------------------------------------------------

/** Все услуги одним плоским массивом (удобно для поиска и фильтров). */
export function getAllServices() {
  return categories.flatMap((cat) =>
    cat.services.map((s) => ({
      ...s,
      categoryId: cat.id,
      categoryTitle: cat.title,
      categoryIcon: cat.icon,
    })),
  );
}

/** Найти услугу по id (возвращает с категорией). */
export function getServiceById(id) {
  for (const cat of categories) {
    const found = cat.services.find((s) => s.id === id);
    if (found) {
      return { ...found, categoryId: cat.id, categoryTitle: cat.title };
    }
  }
  return null;
}

/** Получить услуги одной категории по id категории. */
export function getServicesByCategory(categoryId) {
  const cat = categories.find((c) => c.id === categoryId);
  return cat ? cat.services : [];
}

/** Найти мастера по id. */
export function getMasterById(id) {
  return masters.find((m) => m.id === id) || null;
}

/**
 * Найти мастеров, которые оказывают конкретную услугу (по её id).
 * Возвращает массив мастеров с подключёнными ценами из услуги.
 */
export function getMastersByService(serviceId) {
  return masters
    .filter((m) => m.serviceIds.includes(serviceId))
    .map((m) => {
      const service = getServiceById(serviceId);
      return {
        ...m,
        service: service
          ? {
              id: service.id,
              name: service.name,
              priceFrom: service.priceFrom,
              priceTo: service.priceTo,
              formattedPrice: formatPrice(service),
              unit: service.unit,
              warranty: service.warranty,
            }
          : null,
      };
    });
}

/** Найти мастеров по специализации (например, 'Кондиционеры'). */
export function getMastersBySpecialization(specialization) {
  return masters.filter((m) => m.specialization.includes(specialization));
}

/** Найти мастеров, работающих в конкретном районе Ташкента. */
export function getMastersByDistrict(district) {
  return masters.filter((m) => m.districts.includes(district));
}

/**
 * Получить услуги мастера (полные объекты) по его id — раскрывает serviceIds.
 */
export function getMasterServices(masterId) {
  const master = getMasterById(masterId);
  if (!master) return [];
  return master.serviceIds
    .map((sid) => getServiceById(sid))
    .filter(Boolean);
}

/** Отформатировать цену в виде строки с пробелами и «сум». */
export function formatPrice(service) {
  const fmt = (n) => n.toLocaleString('ru-RU');
  if (service.priceTo != null) {
    return `${fmt(service.priceFrom)} – ${fmt(service.priceTo)} ${META.currencySymbol}`;
  }
  if (service.priceFrom === 0) {
    return 'Бесплатно (при ремонте)';
  }
  return `от ${fmt(service.priceFrom)} ${META.currencySymbol}`;
}

/** Готовый список источников (для страницы «Источники»). */
export function getAllSources() {
  const seen = new Set();
  const out = [];
  for (const s of getAllServices()) {
    const key = s.source.olx || s.source.web;
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push({
        url: key,
        service: s.name,
        note: s.source.note,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Хелперы для проверенных мастеров (3 конкретных человека с телефонами)
// ---------------------------------------------------------------------------

/** Получить проверенного мастера по id. */
export function getVerifiedMasterById(id) {
  return verifiedMasters.find((m) => m.id === id) || null;
}

/** Найти проверенного мастера по специализации (например, 'Кондиционеры'). */
export function getVerifiedMastersBySpecialization(specialization) {
  return verifiedMasters.filter((m) => m.specialization.includes(specialization));
}

/**
 * Найти проверенного мастера, который оказывает конкретную услугу.
 * Возвращает массив мастеров с подключёнными ценами.
 */
export function getVerifiedMastersByService(serviceId) {
  return verifiedMasters
    .filter((m) => m.serviceIds.includes(serviceId))
    .map((m) => ({
      ...m,
      service: (() => {
        const svc = getServiceById(serviceId);
        return svc
          ? {
              id: svc.id,
              name: svc.name,
              formattedPrice: formatPrice(svc),
              warranty: svc.warranty,
            }
          : null;
      })(),
    }));
}

export default servicesDatabase;

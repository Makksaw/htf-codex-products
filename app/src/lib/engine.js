/* eslint-disable */
// Enrichment + the one selector shared by both baskets.
// Baseline flags are read from the raw cells. Feed flags are typed.
// select() does not get a second, dumber implementation.

const REFERENCE_DATE = '2026-11-25';
const STALE_BEFORE = '2025-01-01';

const ALLERGEN_IDS = [
  'gluten', 'crustaceans', 'egg', 'fish', 'peanuts', 'soy', 'milk',
  'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs',
];

const ALLERGEN_PATTERNS = [
  ['gluten', /tarwe|durum|griesmeel|gerst|\brogge\b|spelt|kamut|\bhaver\w*|bulgur|paneermeel|\bmout\w*|\bbloem\b/],
  ['egg', /\beieren\b|\beigeel\b|\bei\b/],
  ['milk', /melkpoeder|\bmelk\b|\broom\b|\bboter\b|yoghurt|mozzarella|parmigiano|pecorino|grana\s*padano|\bkaas\b/],
  ['soy', /soja\w*/],
  ['celery', /selder\w*/],
  ['fish', /\bvis\b|\bzalm\w*|\bkabeljauw\w*/],
  ['nuts', /cashew\w*|amandel\w*|hazelno\w*|pecan\w*|walno\w*|pistache\w*|parano\w*|macadamia\w*/],
  ['peanuts', /pinda\w*/],
  ['crustaceans', /garnaal\w*|schaaldier\w*/],
  ['mustard', /mosterd\w*/],
  ['sesame', /sesam\w*/],
];

const LABEL_WORD = [
  ['gluten', /\bgluten\b/],
  ['egg', /\beieren\b|\bei\b/],
  ['milk', /\bmelk\b/],
  ['soy', /\bsoja\w*/],
  ['celery', /selder\w*/],
  ['fish', /\bvis\b/],
  ['nuts', /\bnoten\b|\bnuts\b/],
  ['peanuts', /pinda\w*/],
  ['crustaceans', /schaaldier\w*/],
  ['mustard', /mosterd\w*/],
  ['sesame', /sesam\w*/],
  ['sulphites', /sulfiet\w*|sulphite\w*/],
  ['lupin', /lupine\w*/],
  ['molluscs', /weekdier\w*|mollusc\w*/],
];

const COUNTRIES = {
  italie: 'IT', belgie: 'BE', nederland: 'NL', frankrijk: 'FR', duitsland: 'DE',
  spanje: 'ES', griekenland: 'GR', india: 'IN', peru: 'PE', turkije: 'TR',
  noorwegen: 'NO', ijsland: 'IS', libanon: 'LB', thailand: 'TH', brazilie: 'BR',
};

const CATEGORY_RULES = [
  [/pesto/, 'sauce.pesto'],
  [/lasagneblad/, 'pasta.fresh'],
  [/lasagne/, 'ready_meal'],
  [/pastasaus|pasta saus|bolognese/, 'sauce.pasta'],
  [/passata|tomatenblokjes/, 'tomato.preserved'],
  [/tagliatelle/, 'pasta.fresh'],
  [/spaghetti|penne/, 'pasta.dried'],
  [/bouillon/, 'stock'],
  [/wrap/, 'ready_meal.wrap'],
  [/pizza/, 'ready_meal.pizza'],
  [/quiche/, 'ready_meal'],
  [/soep/, 'soup'],
  [/satésaus|satesaus|sojasaus|curry/, 'world.sauce'],
  [/kokosmelk/, 'world.pantry'],
  [/zalm|kabeljauw/, 'fish'],
  [/gehakt/, 'meat.mince'],
  [/\bkip\b|kipfilet/, 'meat.poultry'],
  [/\bham\b/, 'meat.charcuterie'],
  [/burger|balletjes|tofu|falafel/, 'protein.vegetarian'],
  [/basmati|risottorijst|\brijst\b/, 'rice'],
  [/couscous|quinoa|bulgur/, 'grain'],
  [/\berwten\b|spinazie|wokgroenten/, 'vegetable.frozen'],
  [/kikkererwten|witte bonen/, 'vegetable.canned'],
  [/wortel|courgette|broccoli/, 'vegetable.fresh'],
  [/yoghurt/, 'dairy.yogurt'],
  [/mozzarella|parmigiano|\bkaas\b/, 'dairy.cheese'],
  [/plantaardige|haverdrink/, 'dairy.alternative'],
  [/\bboter\b/, 'dairy.butter'],
  [/melk/, 'dairy.milk'],
  [/eieren/, 'egg'],
  [/brood/, 'bakery'],
  [/choco pasta|confituur/, 'breakfast.spread'],
  [/muesli|cornflakes/, 'breakfast.cereal'],
  [/olijfolie|zonnebloemolie|\bolie\b/, 'oil'],
  [/bloem patisserie|\bbloem\b|kristalsuiker|\bsuiker\b/, 'baking'],
  [/chips/, 'snack.crisps'],
  [/gemengde noten|\bnoten\b/, 'snack.nuts'],
  [/marshmallow/, 'snack.sweet'],
  [/chocolade/, 'snack.chocolate'],
  [/vanille-ijs|\bijs\b/, 'frozen.dessert'],
  [/sinaasappelsap|appelsap|\bwater\b/, 'drink'],
];

const CATEGORY_PATH = {
  'pasta.dried': 'Food > Pasta > Dried',
  'pasta.fresh': 'Food > Pasta > Fresh',
  'sauce.pasta': 'Food > Sauces > Pasta',
  'sauce.pesto': 'Food > Sauces > Pesto',
  'tomato.preserved': 'Food > Vegetables > Preserved tomatoes',
  'rice': 'Food > Grains > Rice',
  'grain': 'Food > Grains',
  'meat.mince': 'Food > Meat > Mince',
  'meat.poultry': 'Food > Meat > Poultry',
  'meat.charcuterie': 'Food > Meat > Charcuterie',
  'fish': 'Food > Fish',
  'protein.vegetarian': 'Food > Protein > Vegetarian',
  'stock': 'Food > Pantry > Stock',
  'vegetable.fresh': 'Food > Vegetables > Fresh',
  'vegetable.frozen': 'Food > Vegetables > Frozen',
  'vegetable.canned': 'Food > Vegetables > Canned',
  'dairy.milk': 'Food > Dairy > Milk',
  'dairy.yogurt': 'Food > Dairy > Yogurt',
  'dairy.cheese': 'Food > Dairy > Cheese',
  'dairy.butter': 'Food > Dairy > Butter',
  'dairy.alternative': 'Food > Dairy > Alternatives',
  'egg': 'Food > Eggs',
  'bakery': 'Food > Bakery',
  'breakfast.spread': 'Food > Breakfast > Spreads',
  'breakfast.cereal': 'Food > Breakfast > Cereal',
  'oil': 'Food > Pantry > Oil',
  'world.sauce': 'Food > World kitchen > Sauces',
  'world.pantry': 'Food > World kitchen',
  'baking': 'Food > Baking',
  'snack.crisps': 'Food > Snacks > Crisps',
  'snack.nuts': 'Food > Snacks > Nuts',
  'snack.sweet': 'Food > Snacks > Sweets',
  'snack.chocolate': 'Food > Snacks > Chocolate',
  'frozen.dessert': 'Food > Frozen > Dessert',
  'soup': 'Food > Ready meals > Soup',
  'ready_meal': 'Food > Ready meals',
  'ready_meal.pizza': 'Food > Ready meals > Pizza',
  'ready_meal.wrap': 'Food > Ready meals > Wraps',
  'drink': 'Food > Drinks',
};

const NAME_EN = {
  'DH-10041': 'Spaghetti No. 5',
  'DH-10042': 'Penne rigate',
  'DH-10043': 'Spaghetti No. 5',
  'DH-10055': 'Whole wheat spaghetti',
  'DH-10061': 'Fresh tagliatelle',
  'DH-10062': 'Fresh lasagna sheets',
  'DH-11010': 'Tomato-basil pasta sauce',
  'DH-11011': 'Bolognese sauce',
  'DH-11012': 'Pesto alla Genovese',
  'DH-11013': 'Red pesto',
  'DH-11020': 'Passata',
  'DH-11021': 'Chopped tomatoes',
  'DH-12001': 'Basmati rice',
  'DH-12002': 'Arborio risotto rice',
  'DH-12003': 'Couscous',
  'DH-12004': 'Tricolor quinoa',
  'DH-12010': 'Bulgur',
  'DH-20011': 'Beef and pork mince',
  'DH-20012': 'Chicken breast',
  'DH-20013': 'Chicken breast',
  'DH-20020': 'Salmon fillet',
  'DH-20021': 'Cod loin',
  'DH-20030': 'Cooked ham',
  'DH-21001': 'Vegetarian burger',
  'DH-21002': 'Veggie balls',
  'DH-21003': 'Plain tofu',
  'DH-21004': 'Falafel',
  'DH-21010': 'Vegetable stock cubes',
  'DH-30001': 'Carrots',
  'DH-30002': 'Courgette',
  'DH-30003': 'Broccoli',
  'DH-30010': 'Frozen peas',
  'DH-30011': 'Frozen spinach',
  'DH-30012': 'Wok vegetables',
  'DH-30020': 'Chickpeas',
  'DH-30021': 'White beans in tomato sauce',
  'DH-40001': 'Semi-skimmed milk',
  'DH-40002': 'Greek yogurt',
  'DH-40003': 'Greek yogurt 0%',
  'DH-40010': 'Grated mozzarella',
  'DH-40011': 'Grated Parmigiano Reggiano',
  'DH-40012': 'Young cheese slices',
  'DH-40020': 'Oat drink',
  'DH-40030': 'Butter',
  'DH-40040': 'Free-range eggs',
  'DH-50001': 'Multigrain bread',
  'DH-50002': 'White bread',
  'DH-50010': 'Chocolate spread',
  'DH-50011': 'Strawberry jam',
  'DH-50020': 'Nut muesli',
  'DH-50021': 'Cornflakes',
  'DH-60001': 'Extra virgin olive oil',
  'DH-60002': 'Sunflower oil',
  'DH-60010': 'Soy sauce',
  'DH-60011': 'Satay sauce',
  'DH-60012': 'Coconut milk',
  'DH-60013': 'Red curry paste',
  'DH-60020': 'Pastry flour',
  'DH-60021': 'White sugar',
  'DH-70001': 'Plain crisps',
  'DH-70002': 'Mixed nuts',
  'DH-70010': 'Marshmallows',
  'DH-70011': 'Dark chocolate 70%',
  'DH-70020': 'Vanilla ice cream',
  'DH-80001': 'Fresh tomato soup',
  'DH-80002': 'Fresh pumpkin soup',
  'DH-80010': 'Lasagne bolognese',
  'DH-80011': 'Quiche lorraine',
  'DH-80012': 'Pizza margherita',
  'DH-80020': 'Chicken curry wrap',
  'DH-90001': 'Orange juice',
  'DH-90002': 'Cloudy apple juice',
  'DH-90010': 'Sparkling water',
};

const BASELINE_RULES = [
  'Price is parseFloat of the price cell. A comma is not a decimal mark.',
  'An allergen counts only when its word is in the allergen cell. Ingredients are not a filter.',
  'There is no separate “may contain”. The word noten inside that sentence counts as contains.',
  'Vegetarian is false only when the name says meat or fish. Otherwise it is treated as true.',
  'A blank gluten cell means free-from. Quick means the text says “minuut” or “kant en klaar”. Protein per euro does not exist until it is a number. Pork is a word in the name. Duplicates are not linked.',
];

function fold(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function parseCsv(text) {
  const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  const headers = lines[0].split(';').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(';');
    if (cells.length !== headers.length) {
      throw new Error(`Expected ${headers.length} columns, got ${cells.length}: ${line.slice(0, 80)}`);
    }
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index].trim();
    });
    return row;
  });
}

function parseEuro(raw) {
  const text = String(raw || '').trim().replace(/\s/g, '');
  const comma = text.includes(',');
  const value = Number(text.replace(',', '.'));
  return {
    value: Number.isFinite(value) ? value : null,
    comma,
    raw: String(raw || ''),
  };
}

function toBase(amount, unit) {
  if (unit === 'kg') return { value: amount * 1000, unit: 'g' };
  if (unit === 'g' || unit === 'gr' || unit === 'gram') return { value: amount, unit: 'g' };
  if (unit === 'l') return { value: amount * 1000, unit: 'ml' };
  if (unit === 'ml') return { value: amount, unit: 'ml' };
  return null;
}

function parseQty(raw) {
  const source = String(raw || '').trim();
  const text = fold(source).replace(',', '.');
  if (!text) return { value: null, unit: null, pack_count: null, raw: source };
  if (/per stuk/.test(text)) return { value: 1, unit: 'piece', pack_count: 1, raw: source };
  const multi = text.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(kg|g|gr|gram|ml|l)\b/);
  if (multi) {
    const each = toBase(Number(multi[2]), multi[3]);
    const count = Number(multi[1]);
    return { value: each.value * count, unit: each.unit, pack_count: count, raw: source };
  }
  const one = text.match(/(\d+(?:\.\d+)?)\s*(kg|g|gr|gram|ml|l)\b/);
  if (one) {
    const base = toBase(Number(one[1]), one[2]);
    return { value: base.value, unit: base.unit, pack_count: 1, raw: source };
  }
  const pieces = text.match(/(\d+)\s*stuks?\b/);
  if (pieces) {
    const count = Number(pieces[1]);
    return { value: count, unit: 'piece', pack_count: count, raw: source };
  }
  return { value: null, unit: null, pack_count: null, raw: source };
}

function unitPrice(price, qty) {
  if (price == null || qty.value == null) return { unit_price: null, unit_price_per: null };
  if (qty.unit === 'g') return { unit_price: price / (qty.value / 1000), unit_price_per: 'kg' };
  if (qty.unit === 'ml') return { unit_price: price / (qty.value / 1000), unit_price_per: 'L' };
  if (qty.unit === 'piece') return { unit_price: price / qty.value, unit_price_per: 'piece' };
  return { unit_price: null, unit_price_per: null };
}

function categorize(name) {
  const text = String(name || '').toLowerCase();
  for (const [pattern, id] of CATEGORY_RULES) {
    if (pattern.test(text)) return id;
  }
  return 'uncategorised';
}

function rolesFor(categoryId, name) {
  const roles = [];
  const text = String(name || '').toLowerCase();
  if (categoryId.startsWith('pasta')) roles.push('pasta', 'staple', 'dinner');
  if (categoryId === 'sauce.pasta' || categoryId === 'sauce.pesto' || categoryId === 'tomato.preserved' || categoryId === 'world.sauce') {
    roles.push('sauce');
  }
  if (categoryId === 'rice' || categoryId === 'grain') roles.push('grain', 'staple', 'dinner');
  if (categoryId === 'stock') roles.push('stock');
  if (categoryId.startsWith('vegetable')) roles.push('vegetable');
  if ([
    'meat.mince', 'meat.poultry', 'meat.charcuterie', 'fish',
    'protein.vegetarian', 'egg', 'dairy.yogurt', 'dairy.cheese',
  ].includes(categoryId)) roles.push('protein');
  if (categoryId.startsWith('snack') || categoryId === 'breakfast.spread' || categoryId === 'breakfast.cereal') {
    roles.push('snack');
  }
  if (['ready_meal', 'ready_meal.pizza', 'ready_meal.wrap', 'soup'].includes(categoryId)) {
    roles.push('meal', 'dinner');
  }
  if (/spaghetti nr/.test(text)) roles.push('spaghetti-nr5');
  return roles;
}

function completeness(row) {
  const values = Object.values(row);
  const filled = values.filter((value) => String(value || '').trim()).length;
  return filled / values.length;
}

function parseNutrition(raw) {
  const text = String(raw || '').trim();
  if (!text) {
    return { basis: null, kcal: null, protein_g: null, carbs_g: null, fat_g: null, sugar_g: null, fiber_g: null, salt_g: null, omega3_g: null, raw: null };
  }
  const num = (pattern) => {
    const match = text.match(pattern);
    return match ? Number(match[1].replace(',', '.')) : null;
  };
  let basis = null;
  if (/per\s*100\s*g/i.test(text)) basis = '100g';
  else if (/per\s*100\s*ml/i.test(text)) basis = '100ml';
  else if (/per\s*ei\b/i.test(text)) basis = 'egg';
  return {
    basis,
    kcal: num(/(\d+(?:[.,]\d+)?)\s*kcal/i),
    protein_g: num(/eiwit\s*(\d+(?:[.,]\d+)?)/i),
    carbs_g: num(/koolhydraten\s*(\d+(?:[.,]\d+)?)/i),
    fat_g: num(/\bvet\s*(\d+(?:[.,]\d+)?)/i),
    sugar_g: num(/suiker\s*(\d+(?:[.,]\d+)?)/i),
    fiber_g: num(/vezels?\s*(\d+(?:[.,]\d+)?)/i),
    salt_g: num(/\bzout\s*(\d+(?:[.,]\d+)?)/i),
    omega3_g: num(/omega-3\s*(\d+(?:[.,]\d+)?)/i),
    raw: text,
  };
}

function packProtein(nutrition, qty) {
  if (nutrition.protein_g == null) return null;
  if ((nutrition.basis === '100g' && qty.unit === 'g') || (nutrition.basis === '100ml' && qty.unit === 'ml')) {
    return nutrition.protein_g * qty.value / 100;
  }
  if (nutrition.basis === 'egg' && qty.unit === 'piece') return nutrition.protein_g * qty.value;
  return null;
}

function idsIn(text, patterns) {
  const found = [];
  patterns.forEach(([id, pattern]) => {
    if (pattern.test(text) && !found.includes(id)) found.push(id);
  });
  return found;
}

function quote(text, pattern) {
  const match = String(text || '').match(pattern);
  return match ? match[0] : null;
}

function parseLabel(raw) {
  const original = String(raw || '').trim();
  const text = original.toLowerCase();
  if (!text) return { status: 'empty', contains: [], may: [], raw: original };
  if (text.startsWith('zie etiket')) return { status: 'see_label', contains: [], may: [], raw: original };
  if (text === 'geen' || text === 'none') return { status: 'declared_none', contains: [], may: [], raw: original };
  let main = text;
  let mayText = '';
  const mayMatch = text.match(/sporen van (.+?) bevatten/);
  if (mayMatch) {
    mayText = mayMatch[1];
    main = text.replace(/,?\s*kan sporen van .+ bevatten/, '');
  }
  return {
    status: 'declared',
    contains: idsIn(main, LABEL_WORD.concat(ALLERGEN_PATTERNS)),
    may: idsIn(mayText, LABEL_WORD.concat(ALLERGEN_PATTERNS)),
    raw: original,
  };
}

function scanIngredients(raw) {
  const text = String(raw || '');
  const lower = text.toLowerCase();
  const poultryText = lower.replace(/kippeneieren/g, ' ');
  const hits = idsIn(lower, ALLERGEN_PATTERNS);
  const evidence = [];
  ALLERGEN_PATTERNS.forEach(([id, pattern]) => {
    if (hits.includes(id)) {
      evidence.push({
        allergen: id,
        presence: 'contains',
        confidence: 'high',
        source: 'ingredients',
        text: quote(lower, pattern),
      });
    }
  });
  return {
    hits,
    evidence,
    pine: /pijnboompit\w*/.test(lower) ? quote(lower, /pijnboompit\w*/) : null,
    pork: /varken\w*|\bspek\b|\bham\b/.test(lower),
    porkText: quote(lower, /varken\w*|\bspek\b|\bham\b/),
    beef: /rund\w*/.test(lower),
    beefText: quote(lower, /rund\w*/),
    poultry: /kippenvet|kippenbouillon|kippenborst\w*|kipfilet|\bkip\b/.test(poultryText),
    poultryText: quote(poultryText, /kippenvet|kippenbouillon|kippenborst\w*|kipfilet|\bkip\b/),
    fish: hits.includes('fish'),
    crustaceans: hits.includes('crustaceans'),
    gelatine: /gelatine/.test(lower),
    alcohol: /\bwijn\b|\bbier\b/.test(lower),
    alcoholText: quote(lower, /\bwijn\b|\bbier\b/),
    rennet: /stremsel|mozzarella|parmigiano|pecorino|grana\s*padano|\bkaas\b/.test(lower),
    rennetText: quote(lower, /stremsel|mozzarella|parmigiano|pecorino|grana\s*padano|\bkaas\b/),
    nestedStock: /groentebouillon/.test(lower),
    soySauce: /sojasaus/.test(lower),
    unknownStarch: /zetmeel/.test(lower) && !/aardappelzetmeel|maïszetmeel|maiszetmeel/.test(lower),
    starchText: quote(lower, /modifice+\w*\s*zetmeel|zetmeel/),
    vague: quote(lower, /\baroma\b|\bkruiden\b/),
    additives: Array.from(lower.matchAll(/\be\s?(\d{3}[a-z]?)\b/g)).map((match) => `E${match[1].toUpperCase()}`),
  };
}

function unique(list) {
  return Array.from(new Set(list));
}

function decideGluten(label, scan) {
  const high = scan.hits.includes('gluten');
  const labelSays = label.contains.includes('gluten') || label.may.includes('gluten');
  const medium = scan.soySauce && !labelSays && (label.status === 'empty' || label.status === 'see_label');
  if (label.status === 'declared' || label.status === 'declared_none') {
    if (high || labelSays) return { gluten: 'contains', medium: false };
    return { gluten: 'free', medium: false };
  }
  if (high || medium) return { gluten: 'contains', medium: medium && !high };
  if (scan.unknownStarch) return { gluten: 'unknown', medium: false };
  return { gluten: 'unknown', medium: false };
}

function buildDiet(scan, ingredientsPresent) {
  const flesh = scan.beef || scan.pork || scan.poultry || scan.fish || scan.crustaceans || scan.gelatine;
  let vegetarian = null;
  let vegan = null;
  if (!ingredientsPresent) {
    vegetarian = null;
    vegan = null;
  } else if (flesh) {
    vegetarian = false;
    vegan = false;
  } else if (scan.rennet || scan.nestedStock) {
    vegetarian = null;
    vegan = false;
    if (!scan.rennet && scan.nestedStock && !scan.hits.includes('egg') && !scan.hits.includes('milk')) {
      vegan = null;
    }
  } else if (scan.hits.includes('egg') || scan.hits.includes('milk')) {
    vegetarian = true;
    vegan = false;
  } else if (scan.vague) {
    vegetarian = true;
    vegan = null;
  } else {
    vegetarian = true;
    vegan = true;
  }

  let pork = null;
  if (!ingredientsPresent) pork = null;
  else if (scan.pork) pork = true;
  else if (scan.gelatine) pork = null;
  else pork = false;

  return {
    vegetarian,
    vegan,
    pork,
    beef: ingredientsPresent ? scan.beef : null,
    poultry: ingredientsPresent ? scan.poultry : null,
    alcohol: ingredientsPresent ? scan.alcohol : null,
  };
}

function parsePrep(description, category) {
  const text = String(description || '').toLowerCase();
  const aisle = String(category || '').toLowerCase();
  const numbered = text.match(/(\d+)\s*minut/);
  if (numbered) {
    const minutes = Number(numbered[1]);
    return { minutes, quick: minutes <= 15, method: 'stovetop', evidence: numbered[0] };
  }
  if (/enkele minuten/.test(text)) {
    return { minutes: null, quick: true, method: 'stovetop', evidence: 'enkele minuten' };
  }
  if (/oven/.test(text)) return { minutes: null, quick: false, method: 'oven', evidence: 'oven' };
  if (/belegde broodjes/.test(aisle)) return { minutes: null, quick: true, method: 'none', evidence: 'ready-to-eat sandwich' };
  return { minutes: null, quick: null, method: null, evidence: null };
}

function parseStorage(raw) {
  const text = String(raw || '').trim();
  const lower = text.toLowerCase();
  let storageClass = 'unknown';
  if (!lower) storageClass = 'unknown';
  else if (/-18|diepvries/.test(lower)) storageClass = 'frozen';
  else if (/na opening koel/.test(lower)) storageClass = 'chilled_after_opening';
  else if (/koel|frigo|refrigerat/.test(lower)) storageClass = 'chilled';
  else if (/droog|donker/.test(lower)) storageClass = 'ambient';
  let useWithinDays = null;
  if (/zelfde dag/.test(lower)) useWithinDays = 0;
  else {
    const days = lower.match(/(\d+)\s*dag/);
    if (days) useWithinDays = Number(days[1]);
  }
  return { class: storageClass, use_within_days: useWithinDays, raw: text || null };
}

function signatureOf(name, brand, price) {
  const normalized = fold(name).replace(/0\s*%/g, ' zero ').replace(/[^a-z0-9]+/g, '');
  const brandKey = fold(brand).replace(/[^a-z0-9]+/g, '');
  return `${brandKey}|${normalized}|${Number(price).toFixed(2)}`;
}

function linkDuplicates(products) {
  const groups = new Map();
  products.forEach((product) => {
    const key = signatureOf(product.name, product.brand, product.offers.price);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(product);
  });
  groups.forEach((group, key) => {
    if (group.length < 2) {
      group[0].identity = {
        duplicate_group: null,
        duplicate_confidence: null,
        canonical: true,
        inherited: [],
        inherited_from: null,
      };
      return;
    }
    const units = new Set(group.map((product) => `${product.net_quantity.value}|${product.net_quantity.unit}`));
    const confidence = units.size === 1 ? 'high' : 'medium';
    const ranked = group.slice().sort((a, b) => {
      if (b.record_completeness !== a.record_completeness) return b.record_completeness - a.record_completeness;
      return String(b.catalog_updated || '').localeCompare(String(a.catalog_updated || ''))
        || a.sku.localeCompare(b.sku);
    });
    const canonical = ranked[0];
    group.forEach((product) => {
      product.identity = {
        duplicate_group: key,
        duplicate_confidence: confidence,
        canonical: product.sku === canonical.sku,
        inherited: [],
        inherited_from: null,
      };
    });
    if (confidence === 'high') {
      group.forEach((product) => {
        if (product.sku === canonical.sku) return;
        const inherited = [];
        ['protein_g', 'carbs_g', 'fat_g', 'sugar_g', 'fiber_g', 'salt_g', 'omega3_g'].forEach((field) => {
          if (product.nutrition[field] == null && canonical.nutrition[field] != null) {
            product.nutrition[field] = canonical.nutrition[field];
            inherited.push(`nutrition.${field}`);
          }
        });
        if (!product.nutrition.basis && canonical.nutrition.basis && product.nutrition.kcal === canonical.nutrition.kcal) {
          product.nutrition.basis = canonical.nutrition.basis;
          inherited.push('nutrition.basis');
        }
        if (!product.storage.raw && canonical.storage.raw) {
          product.storage = { ...canonical.storage };
          inherited.push('storage');
        }
        if (inherited.length) {
          product.identity.inherited = inherited;
          product.identity.inherited_from = canonical.sku;
          product.gaps.push({
            id: 'nutrition_inherited',
            detail: `Missing nutrition copied from ${canonical.sku}, the more complete record of the same product.`,
          });
        }
      });
    }
  });
}

function enrichRow(row) {
  const name = row.product_naam;
  const brand = row.merk;
  const money = parseEuro(row.prijs);
  const qty = parseQty(row.inhoud);
  const priced = unitPrice(money.value, qty);
  const categoryId = categorize(name);
  const ingredients = row.ingredienten || '';
  const label = parseLabel(row.allergenen);
  const scan = scanIngredients(ingredients);
  const glutenDecision = decideGluten(label, scan);
  const diet = buildDiet(scan, Boolean(ingredients.trim()));
  diet.organic = /\bbio\b|biologisch/.test(`${brand} ${name} ${row.categorie} ${row.omschrijving} ${ingredients}`.toLowerCase());
  const prep = parsePrep(row.omschrijving, row.categorie);
  const storage = parseStorage(row.bewaren);
  const nutrition = parseNutrition(row.voedingswaarde);
  const proteinPack = packProtein(nutrition, qty);
  const proteinPerEur = proteinPack != null && money.value ? proteinPack / money.value : null;
  const proteinPer100 = nutrition.basis === '100g' || nutrition.basis === '100ml' ? nutrition.protein_g : null;
  const proteinEligible = proteinPerEur != null && ((proteinPer100 != null && proteinPer100 >= 15) || nutrition.basis === 'egg');
  const originRaw = row.herkomst ? row.herkomst : null;
  const originCountry = originRaw ? (COUNTRIES[fold(originRaw)] || null) : null;

  const contains = new Set([...label.contains, ...scan.hits]);
  if (glutenDecision.gluten === 'contains') contains.add('gluten');
  if (glutenDecision.medium) contains.add('gluten');
  const may = new Set(label.may);
  contains.forEach((id) => may.delete(id));

  const evidence = [];
  label.contains.forEach((id) => {
    evidence.push({ allergen: id, presence: 'contains', confidence: 'high', source: 'label', text: label.raw });
  });
  label.may.forEach((id) => {
    if (contains.has(id)) return;
    evidence.push({ allergen: id, presence: 'may_contain', confidence: 'high', source: 'label', text: label.raw });
  });
  scan.evidence.forEach((item) => {
    if (!evidence.some((existing) => existing.allergen === item.allergen && existing.source === 'ingredients')) {
      evidence.push(item);
    }
  });
  if (glutenDecision.medium) {
    evidence.push({
      allergen: 'gluten',
      presence: 'contains',
      confidence: 'medium',
      source: 'ingredients',
      text: 'sojasaus',
      note: 'Wheat is usual in soy sauce and is not listed as its own ingredient.',
    });
  }

  const other = [];
  if (scan.pine) other.push({ id: 'pine_nuts', detail: `Pine nuts (${scan.pine}) are not an EU Annex II nut. Kept separate so a tree-nut rule can still exclude them.` });
  if (scan.alcohol) other.push({ id: 'alcohol', detail: `Alcohol listed as ${scan.alcoholText}.` });
  if (scan.gelatine) other.push({ id: 'animal_gelatine', detail: 'Gelatine is animal. The species is not stated.' });

  const gaps = [];
  const contradictions = [];
  if (label.status === 'empty') {
    gaps.push({ id: 'allergen_label_empty', detail: 'Allergen cell is empty. Empty is not the same as geen.' });
  }
  if (label.status === 'see_label') {
    gaps.push({ id: 'allergen_label_see_label', detail: 'Allergen cell says “zie etiket” and does not name an allergen.' });
  }
  if (diet.vegetarian == null && scan.rennet) {
    gaps.push({ id: 'rennet_unspecified', detail: 'Cheese or stremsel is listed. Animal rennet would not be vegetarian; the source is not stated.' });
  }
  if (prep.quick === true && prep.minutes == null) {
    gaps.push({ id: 'prep_minutes_not_stated', detail: 'The label says a few minutes and gives no number. No number was invented.' });
  }
  if (prep.quick == null) {
    gaps.push({ id: 'prep_unknown', detail: 'No prep time on the label.' });
  }
  if (scan.nestedStock && !scan.poultry) {
    gaps.push({ id: 'nested_stock_unitemised', detail: 'Ingredient list says groentebouillon without listing that stock.' });
  }
  if (glutenDecision.medium) {
    gaps.push({ id: 'soy_sauce_wheat_assumed', detail: 'sojasaus usually contains wheat. Confidence is medium because tarwe is not written out.' });
  }
  if (scan.alcohol && !contains.has('sulphites')) {
    gaps.push({ id: 'sulphites_not_declared_for_wine', detail: 'Wine is listed. Sulphites are not declared, so they are not asserted.' });
  }
  if (scan.unknownStarch && glutenDecision.gluten === 'unknown') {
    gaps.push({ id: 'modified_starch_source_unknown', detail: `${scan.starchText || 'zetmeel'} does not say wheat, maize, or potato.` });
  }
  if (scan.gelatine) {
    gaps.push({ id: 'species_of_gelatine_unknown', detail: 'Gelatine species is not stated, so pork is unknown rather than false.' });
  }
  if (scan.vague && diet.vegan == null) {
    gaps.push({ id: 'vague_ingredient', detail: `${scan.vague} is not itemised, so vegan stays unknown.` });
  }
  if (money.comma) {
    gaps.push({ id: 'price_decimal_comma', detail: 'Price cell uses a comma. parseFloat reads 1,19 as 1.' });
  }
  if (/\bbio\b/i.test(row.categorie || '')) {
    gaps.push({ id: 'category_mixes_diet', detail: 'Bio is stored in the category. Organic is an attribute, not an aisle.' });
  }
  if (row.laatst_bijgewerkt && row.laatst_bijgewerkt < STALE_BEFORE) {
    gaps.push({ id: 'catalog_stale', detail: `Row last touched ${row.laatst_bijgewerkt}, before ${STALE_BEFORE}.` });
  }

  const derivedMissed = Array.from(contains).filter((id) => !label.contains.includes(id) && !label.may.includes(id));
  if (derivedMissed.length && label.status !== 'declared') {
    contradictions.push({
      id: 'label_misses_allergen',
      detail: `Ingredients indicate ${derivedMissed.join(', ')}. The allergen cell does not name them.`,
    });
  }
  const plantName = /groente|vegetar|veggie/.test(name.toLowerCase());
  if (plantName && diet.vegetarian === false) {
    contradictions.push({
      id: 'name_says_plant',
      detail: `Name reads as plant-based. Ingredients include ${scan.poultryText || scan.beefText || scan.porkText || 'animal fat or flesh'}.`,
    });
  }
  if (/soep/.test(name.toLowerCase()) && diet.vegetarian === false) {
    contradictions.push({
      id: 'soup_contains_meat',
      detail: `Soup name does not say meat. Ingredients include ${scan.beefText || scan.porkText || scan.poultryText}.`,
    });
  }

  const facets = [];
  if (diet.organic) facets.push('organic');
  if (glutenDecision.gluten === 'free') facets.push('gluten_free');
  if (diet.vegetarian === true) facets.push('vegetarian');
  if (diet.vegan === true) facets.push('vegan');
  if (prep.quick === true) facets.push('quick');
  if (proteinEligible) facets.push('high_protein');

  return {
    '@type': 'Product',
    sku: row.sku,
    name,
    name_en: NAME_EN[row.sku] || name,
    brand,
    description: row.omschrijving || null,
    category_id: categoryId,
    category_path: CATEGORY_PATH[categoryId] || 'Catalog > Uncategorised',
    category_raw: row.categorie || null,
    roles: rolesFor(categoryId, name),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: money.value,
      price_raw: money.raw,
      price_decimal_comma: money.comma,
      unit_price: priced.unit_price == null ? null : Math.round(priced.unit_price * 10000) / 10000,
      unit_price_per: priced.unit_price_per,
    },
    net_quantity: qty,
    origin_raw: originRaw,
    origin_country: originCountry,
    allergen: {
      contains: unique(Array.from(contains)).sort(),
      may_contain: unique(Array.from(may)).sort(),
      label_status: label.status,
      label_raw: label.raw,
      gluten: glutenDecision.gluten,
      evidence,
    },
    other_risks: other,
    diet,
    nutrition,
    protein_g_in_pack: proteinPack == null ? null : Math.round(proteinPack * 10) / 10,
    protein_g_per_eur: proteinPerEur == null ? null : Math.round(proteinPerEur * 100) / 100,
    protein_rank_eligible: proteinEligible,
    prep,
    storage,
    additives: unique(scan.additives),
    signals: {
      pork: scan.porkText,
      beef: scan.beefText,
      poultry: scan.poultryText,
      rennet: scan.rennetText,
      alcohol: scan.alcoholText,
      pine_nuts: scan.pine,
    },
    facets,
    gaps,
    contradictions,
    identity: {
      duplicate_group: null,
      duplicate_confidence: null,
      canonical: true,
      inherited: [],
      inherited_from: null,
    },
    record_completeness: Math.round(completeness(row) * 100) / 100,
    catalog_updated: row.laatst_bijgewerkt || null,
    catalog_stale: Boolean(row.laatst_bijgewerkt && row.laatst_bijgewerkt < STALE_BEFORE),
    source: { ...row },
  };
}

function metaFor(count) {
  return {
    title: 'Codex of Achrona — enriched product feed',
    source: 'codex-producten_hackTheFuture.csv',
    reference_date: REFERENCE_DATE,
    product_count: count,
    principles: [
      'An empty allergen cell is unknown, not none.',
      'Allergens are taken from the allergen cell or quoted from ingredients. They are not guessed.',
      'Cheese or stremsel with no rennet source stays vegetarian: null.',
      'Prep minutes stay null when the label gives no number.',
      'Pine nuts are not filed as EU nuts. Gelatine species stays unknown.',
    ],
    definitions: {
      vegetarian: 'Lacto-ovo. False if meat, poultry, fish, crustacean, or gelatine is listed. Null if rennet source or a nested stock is unstated.',
      gluten_free: 'free only when the allergen cell speaks (a list or geen) and no gluten source is present. An empty cell is unknown. Wheat in the ingredients overrides an empty cell.',
      quick: 'True only when the label states a time of 15 minutes or less, says “enkele minuten”, or the product is a ready-to-eat sandwich. Oven with no time is false.',
      high_protein: 'At least 15g protein per 100g, or eggs with a per-egg protein figure. Foods below that density are not ranked as protein foods.',
    },
    enums: {
      allergen: ALLERGEN_IDS,
      gluten: ['contains', 'free', 'unknown'],
      tri: ['true', 'false', 'null'],
      label_status: ['empty', 'declared', 'declared_none', 'see_label'],
    },
  };
}

function enrichAll(rows) {
  const products = rows.map(enrichRow);
  linkDuplicates(products);
  products.forEach((product) => {
    if (product.protein_g_in_pack == null) {
      const pack = packProtein(product.nutrition, product.net_quantity);
      product.protein_g_in_pack = pack == null ? null : Math.round(pack * 10) / 10;
      product.protein_g_per_eur = pack != null && product.offers.price
        ? Math.round((pack / product.offers.price) * 100) / 100
        : null;
      const per100 = product.nutrition.basis === '100g' || product.nutrition.basis === '100ml'
        ? product.nutrition.protein_g
        : null;
      product.protein_rank_eligible = product.protein_g_per_eur != null
        && ((per100 != null && per100 >= 15) || product.nutrition.basis === 'egg');
      if (product.protein_rank_eligible && !product.facets.includes('high_protein')) product.facets.push('high_protein');
    }
  });
  return { meta: metaFor(products.length), products };
}

function baselineFlags(product) {
  const allergen = (product.source.allergenen || '').toLowerCase();
  const name = `${product.name} ${product.source.categorie || ''} ${product.brand || ''}`.toLowerCase();
  const described = `${product.source.omschrijving || ''} ${product.source.categorie || ''}`.toLowerCase();
  const organicBlob = `${name} ${product.source.omschrijving || ''} ${product.source.ingredienten || ''}`;
  const contains = [];
  const add = (id, pattern) => {
    if (pattern.test(allergen)) contains.push(id);
  };
  add('gluten', /gluten/);
  add('egg', /\bei\b|eieren/);
  add('milk', /melk/);
  add('soy', /soja/);
  add('celery', /selder/);
  add('fish', /\bvis\b/);
  add('nuts', /noten|nuts/);
  add('crustaceans', /schaaldier/);
  add('mustard', /mosterd/);
  add('sesame', /sesam/);
  add('peanuts', /pinda/);
  const meatName = /vlees|gehakt|\bkip\b|kipfilet|zalm|kabeljauw|\bham\b|spek|rund|varken|worst/;
  return {
    contains,
    mayContain: [],
    other: [],
    gluten: contains.includes('gluten') ? 'contains' : 'free',
    vegetarian: meatName.test(name) ? false : true,
    pork: /varken|\bspek\b|\bham\b|bacon|pork/.test(product.name.toLowerCase()) ? true : false,
    quick: /minuut|kant-en-klaar|kant en klaar/.test(described),
    proteinPerEur: null,
    proteinEligible: null,
    organic: /\bbio\b|biologisch/.test(organicBlob),
    canonical: true,
    duplicateGroup: null,
    price: parseFloat(String(product.source.prijs).replace(/\s/g, '')),
  };
}

function feedFlags(product) {
  return {
    contains: product.allergen.contains,
    mayContain: product.allergen.may_contain,
    other: product.other_risks.map((risk) => risk.id),
    gluten: product.allergen.gluten,
    vegetarian: product.diet.vegetarian,
    pork: product.diet.pork,
    quick: product.prep.quick,
    proteinPerEur: product.protein_g_per_eur,
    proteinEligible: product.protein_rank_eligible,
    organic: product.diet.organic,
    canonical: product.identity.canonical,
    duplicateGroup: product.identity.duplicate_group,
    price: product.offers.price,
  };
}

function blocked(flags, filters) {
  const rules = filters || {};
  for (const id of rules.excludeContains || []) {
    if (flags.contains.includes(id)) return `contains:${id}`;
  }
  for (const id of rules.excludeMayContain || []) {
    if ((flags.mayContain || []).includes(id)) return `may:${id}`;
  }
  for (const id of rules.excludeOther || []) {
    if ((flags.other || []).includes(id)) return `other:${id}`;
  }
  if (rules.gluten === 'free' && flags.gluten !== 'free') return `gluten:${flags.gluten}`;
  if (rules.vegetarian === true && flags.vegetarian !== true) return `vegetarian:${String(flags.vegetarian)}`;
  if (rules.pork === 'free' && flags.pork !== false) return `pork:${String(flags.pork)}`;
  if (rules.quick === true && flags.quick !== true) return 'not-quick';
  if (rules.protein === true && flags.proteinEligible === false) return 'protein-incomparable';
  if (rules.organic === true && flags.organic !== true) return 'not-organic';
  if (rules.dedupe && flags.canonical === false) return 'duplicate';
  return null;
}

function keywordScore(name, keywords) {
  const text = fold(name);
  return (keywords || []).reduce((total, [word, weight]) => (
    text.includes(fold(word)) ? total + weight : total
  ), 0);
}

function compareScored(a, b, mission) {
  if (b.score !== a.score) return b.score - a.score;
  if (mission.rank === 'protein') {
    const left = a.item.flags.proteinPerEur;
    const right = b.item.flags.proteinPerEur;
    if (left == null && right != null) return 1;
    if (right == null && left != null) return -1;
    if (left != null && right != null && left !== right) return right - left;
  }
  const leftPrice = Number.isFinite(a.item.flags.price) ? a.item.flags.price : 999;
  const rightPrice = Number.isFinite(b.item.flags.price) ? b.item.flags.price : 999;
  if (leftPrice !== rightPrice) return leftPrice - rightPrice;
  if (a.item.completeness !== b.item.completeness) return b.item.completeness - a.item.completeness;
  return a.item.sku.localeCompare(b.item.sku);
}

function select(products, mission, mode) {
  const items = products.map((product) => ({
    sku: product.sku,
    name: product.name,
    name_en: product.name_en,
    roles: product.roles,
    completeness: product.record_completeness,
    flags: mode === 'raw' ? baselineFlags(product) : feedFlags(product),
    product,
  }));
  const slots = mission.slots.map((slot) => {
    const rejected = [];
    const eligible = [];
    items.filter((item) => item.roles.includes(slot.tag)).forEach((item) => {
      const score = keywordScore(item.name, slot.keywords);
      if (score < (slot.minScore == null ? 1 : slot.minScore)) return;
      const reason = blocked(item.flags, mission.filters);
      if (reason) rejected.push({ item, reason, score });
      else eligible.push({ item, score });
    });
    rejected.sort((a, b) => b.score - a.score || a.item.sku.localeCompare(b.item.sku));
    eligible.sort((a, b) => compareScored(a, b, mission));
    const picked = slot.pick === 'all'
      ? eligible.map((entry) => entry.item)
      : (eligible[0] ? [eligible[0].item] : []);
    return {
      id: slot.id,
      label: slot.label,
      required: Boolean(slot.required),
      picked,
      also: slot.pick === 'all' ? [] : eligible.slice(1, 3).map((entry) => entry.item),
      rejected: rejected.slice(0, 4),
    };
  });
  const pickedItems = slots.flatMap((slot) => slot.picked);
  const total = (reader) => Math.round(pickedItems.reduce((sum, item) => sum + reader(item), 0) * 100) / 100;
  return {
    missionId: mission.id,
    mode,
    slots,
    totalAgent: total((item) => (Number.isFinite(item.flags.price) ? item.flags.price : 0)),
    totalReal: total((item) => item.product.offers.price || 0),
  };
}

function judge(mission, result) {
  const picked = result.slots.flatMap((slot) => slot.picked);
  const unsafe = picked.filter((item) => mission.harmful(item.product));
  if (unsafe.length) return { status: 'unsafe', unsafe };
  const missing = result.slots.filter((slot) => slot.required && slot.picked.length === 0);
  if (missing.length) return { status: 'incomplete', missing };
  if (mission.succeedsWhen && !mission.succeedsWhen(picked.map((item) => item.product))) {
    return { status: 'wrong' };
  }
  return { status: 'safe' };
}

function summarize(products) {
  const has = (id) => products.filter((product) => product.gaps.some((gap) => gap.id === id)).length;
  return {
    products: products.length,
    labelEmpty: products.filter((product) => product.allergen.label_status === 'empty').length,
    labelNone: products.filter((product) => product.allergen.label_status === 'declared_none').length,
    labelSee: products.filter((product) => product.allergen.label_status === 'see_label').length,
    labelMiss: products.filter((product) => product.contradictions.some((item) => item.id === 'label_misses_allergen')).length,
    nameLie: products.filter((product) => product.contradictions.some((item) => item.id === 'name_says_plant' || item.id === 'soup_contains_meat')).length,
    glutenUnknown: products.filter((product) => product.allergen.gluten === 'unknown').length,
    vegetarianUnknown: products.filter((product) => product.diet.vegetarian == null).length,
    duplicateGroups: new Set(products.map((product) => product.identity.duplicate_group).filter(Boolean)).size,
    stale: products.filter((product) => product.catalog_stale).length,
    commaPrices: has('price_decimal_comma'),
    quick: products.filter((product) => product.prep.quick === true).length,
    prepNumber: products.filter((product) => product.prep.minutes != null).length,
    categoryMixesDiet: has('category_mixes_diet'),
  };
}

function toJsonLd(product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    sku: product.sku,
    name: product.name,
    brand: { '@type': 'Brand', name: product.brand },
    category: product.category_path,
    description: product.description,
    countryOfOrigin: product.origin_country,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: product.offers.price,
    },
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'allergen_contains', value: product.allergen.contains.join(' ') || 'none_declared' },
      { '@type': 'PropertyValue', name: 'allergen_may_contain', value: product.allergen.may_contain.join(' ') || 'none_declared' },
      { '@type': 'PropertyValue', name: 'allergen_label_status', value: product.allergen.label_status },
      { '@type': 'PropertyValue', name: 'gluten', value: product.allergen.gluten },
      { '@type': 'PropertyValue', name: 'vegetarian', value: product.diet.vegetarian },
      { '@type': 'PropertyValue', name: 'vegan', value: product.diet.vegan },
      { '@type': 'PropertyValue', name: 'organic', value: product.diet.organic },
      { '@type': 'PropertyValue', name: 'pork', value: product.diet.pork },
      { '@type': 'PropertyValue', name: 'quick', value: product.prep.quick },
      { '@type': 'PropertyValue', name: 'prep_minutes', value: product.prep.minutes },
      { '@type': 'PropertyValue', name: 'unit_price_eur', value: product.offers.unit_price },
      { '@type': 'PropertyValue', name: 'unit_price_per', value: product.offers.unit_price_per },
      { '@type': 'PropertyValue', name: 'catalog_stale', value: product.catalog_stale },
    ],
  };
}

function exportFeed(feed) {
  return {
    meta: feed.meta,
    products: feed.products,
  };
}

module.exports = {
  ALLERGEN_IDS,
  BASELINE_RULES,
  parseCsv,
  enrichAll,
  select,
  judge,
  summarize,
  toJsonLd,
  exportFeed,
  baselineFlags,
  feedFlags,
};

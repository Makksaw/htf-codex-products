/* eslint-disable */
const fs = require('fs');
const path = require('path');
const { parseCsv, enrichAll, select, judge, summarize } = require('../src/lib/engine');
const { MISSIONS } = require('../src/lib/missions');

const root = path.resolve(__dirname, '..', '..');
const csvPath = path.join(root, 'initial_data', 'codex-producten_hackTheFuture.csv');
const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
fs.mkdirSync(path.join(__dirname, '..', 'src', 'data'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'src', 'data', 'rows.json'), JSON.stringify(rows, null, 2));

const feed = enrichAll(rows);
fs.writeFileSync(path.join(root, 'codex-enriched.json'), JSON.stringify(feed, null, 2));
fs.writeFileSync(path.join(__dirname, '..', 'public', 'codex-enriched.json'), JSON.stringify(feed));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const bySku = Object.fromEntries(feed.products.map((product) => [product.sku, product]));
assert(feed.products.length === 73, `expected 73 products, got ${feed.products.length}`);
assert(!feed.products.some((product) => product.category_id === 'uncategorised'), 'uncategorised product');

const pesto = bySku['DH-11012'];
assert(pesto.allergen.contains.includes('nuts'), 'pesto should contain nuts');
assert(pesto.allergen.contains.includes('milk'), 'pesto should contain milk');
assert(pesto.allergen.label_status === 'empty', 'pesto label empty');
assert(pesto.other_risks.some((risk) => risk.id === 'pine_nuts'), 'pesto pine nuts');
assert(pesto.diet.vegetarian == null, 'pesto vegetarian unknown');
assert(!pesto.gaps.some((gap) => gap.id === 'rennet_unspecified') === false, 'pesto rennet gap');

const stock = bySku['DH-21010'];
assert(stock.diet.vegetarian === false, 'stock not vegetarian');
assert(stock.diet.poultry === true, 'stock poultry');
assert(stock.contradictions.some((item) => item.id === 'name_says_plant'), 'stock name lie');

const penne = bySku['DH-10042'];
assert(penne.offers.price === 1.19, 'penne price');
assert(penne.offers.price_decimal_comma === true, 'penne comma');
assert(penne.allergen.gluten === 'contains', 'penne gluten');
assert(parseFloat(penne.source.prijs) === 1, 'baseline parseFloat penne');

const chocolate = bySku['DH-70011'];
assert(chocolate.allergen.may_contain.includes('nuts'), 'chocolate traces');
assert(!chocolate.allergen.contains.includes('nuts'), 'chocolate is not contains nuts');
assert(chocolate.allergen.contains.includes('soy'), 'chocolate soy');

const spread = bySku['DH-50010'];
assert(spread.allergen.contains.includes('nuts'), 'spread nuts');
assert(spread.allergen.label_status === 'empty', 'spread label empty');

const satay = bySku['DH-60011'];
assert(satay.allergen.contains.includes('peanuts'), 'satay peanuts');

const passata = bySku['DH-11020'];
assert(passata.allergen.gluten === 'free', 'passata gluten free');
const basmati = bySku['DH-12001'];
assert(basmati.allergen.gluten === 'free', 'basmati gluten free');
const sauce = bySku['DH-11010'];
assert(sauce.allergen.gluten === 'unknown', 'tomato sauce gluten unknown');
assert(!/knoflook|garlic/.test((sauce.source.ingredienten || '').toLowerCase()), 'do not import garlic');

const lasagne = bySku['DH-80010'];
assert(lasagne.prep.quick === false, 'lasagne not quick');
assert(lasagne.diet.pork === false, 'lasagne pork false');
const tagliatelle = bySku['DH-10061'];
assert(tagliatelle.prep.quick === true && tagliatelle.prep.minutes == null, 'tagliatelle minutes stay null');
const couscous = bySku['DH-12003'];
assert(couscous.prep.minutes === 5, 'couscous 5 min');

const quiche = bySku['DH-80011'];
assert(quiche.diet.pork === true, 'quiche pork');
const eggs = bySku['DH-40040'];
assert(eggs.protein_rank_eligible === true, 'eggs eligible');
const yogurt = bySku['DH-40002'];
assert(yogurt.protein_rank_eligible === false, 'yogurt below density');
const yogurt0 = bySku['DH-40003'];
assert(yogurt0.protein_g_per_eur == null, '0% protein not copied');
assert(yogurt0.identity.duplicate_group == null, '0% is not a duplicate');

const canonical = bySku['DH-10041'];
const twin = bySku['DH-10043'];
assert(canonical.identity.canonical === true, '10041 canonical');
assert(twin.identity.canonical === false, '10043 duplicate');
assert(twin.identity.duplicate_group === canonical.identity.duplicate_group, 'same group');
assert(bySku['DH-10055'].diet.organic === true, 'bio spaghetti');
assert(canonical.diet.organic === false, 'regular spaghetti not organic');

const chickenA = bySku['DH-20012'];
const chickenB = bySku['DH-20013'];
assert(chickenA.identity.duplicate_group && chickenA.identity.duplicate_group === chickenB.identity.duplicate_group, 'chicken group');
assert(chickenB.nutrition.protein_g == null, 'chicken nutrition not inherited at medium confidence');

console.log(JSON.stringify(summarize(feed.products), null, 2));
let failed = 0;
MISSIONS.forEach((mission) => {
  const raw = select(feed.products, mission, 'raw');
  const restored = select(feed.products, mission, 'restored');
  const rawJudge = judge(mission, raw);
  const restoredJudge = judge(mission, restored);
  const line = (result) => result.slots.map((slot) => (
    `${slot.label}: ${slot.picked.map((item) => item.sku).join('+') || '—'}`
  )).join(' | ');
  console.log(`\n${mission.id}`);
  console.log(`  raw      ${rawJudge.status}  ${line(raw)}  €${raw.totalAgent} (real €${raw.totalReal})`);
  console.log(`  restored ${restoredJudge.status}  ${line(restored)}  €${restored.totalReal}`);
  if (mission.id === 'organic') {
    if (rawJudge.status !== 'safe' || restoredJudge.status !== 'safe') failed += 1;
  } else if (rawJudge.status === 'safe' || restoredJudge.status !== 'safe') {
    console.log('  UNEXPECTED');
    failed += 1;
  }
});

if (failed) {
  console.error(`\n${failed} mission(s) did not split the way the pitch expects`);
  process.exit(1);
}
console.log('\nAll mission checks passed.');

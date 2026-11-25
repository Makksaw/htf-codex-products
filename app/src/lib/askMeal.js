const MODEL = 'grok-4.3';
const correctedRows = require('../data/corrected.json');
const correctedBySku = new Map(correctedRows.map((row) => [row.sku, row]));

function packOf(qty) {
  if (!qty || qty.value == null) return '';
  if (qty.unit === 'g') return qty.value >= 1000 ? `${qty.value / 1000}kg` : `${qty.value}g`;
  if (qty.unit === 'ml') return qty.value >= 1000 ? `${qty.value / 1000}L` : `${qty.value}ml`;
  return `${qty.value}pc`;
}

function catalogOf(products) {
  return products.map((product) => {
    const row = correctedBySku.get(product.sku);
    if (!row) {
      const contains = product.allergen.contains.join('+');
      return [product.sku, product.name, packOf(product.net_quantity), Number(product.offers.price).toFixed(2), contains]
        .filter(Boolean)
        .join('|');
    }
    const contains = (row.allergenen?.bevat || []).filter(Boolean).join('+') || 'none';
    const price = Number(row.prijs?.bedrag);
    const shown = Number.isFinite(price) ? price.toFixed(2) : '';
    return [row.sku, row.product_naam, row.inhoud?.weergave || '', shown, contains].join('|');
  }).join('\n');
}

function rawCatalogOf(products) {
  return products.map((product) => {
    const price = parseFloat(String(product.source?.prijs || '').replace(/\s/g, ''));
    const shown = Number.isFinite(price) ? price.toFixed(2) : '';
    const label = String(product.source?.allergenen || '').trim() || 'empty';
    return [product.sku, product.name, packOf(product.net_quantity), shown, label].join('|');
  }).join('\n');
}

function systemPrompt(catalog, basketCount) {
  const baskets = basketCount === 2
    ? `Two baskets of the same groceries. The first spends less. The second spends more. Say may use the words cheaper and more expensive. pitch names the allergen words written on the catalog lines you kept or dropped, such as "Left out tree_nuts".
{"baskets":[{"title":"","pitch":"","items":[{"sku":"","qty":1,"role":""}]},{"title":"","pitch":"","items":[{"sku":"","qty":1,"role":""}]}]}`
    : `One basket. Do not say cheaper, lower, higher, or a fuller fridge. pitch says "Allergen cell is empty" when a product you included has the allergen value empty or "zie etiket".
{"baskets":[{"title":"","pitch":"","items":[{"sku":"","qty":1,"role":""}]}]}`;
  const allergenRule = basketCount === 2
    ? 'The allergen column is a fact. none means nothing listed. Leave a food out of both baskets when that column names an allergy the shopper already named.'
    : 'The allergen column is the only allergen fact. Dutch words count only when they are written there: melk is milk, noten is tree nuts, pinda is peanuts, ei is eggs, selder is celery, soja is soy, vis is fish, sesam is sesame, schaaldieren is shellfish, mosterd is mustard, geen means none. The value empty, or "zie etiket", names no allergen. Keep that product. Do not drop it because of the product name or anything you remember.';
  return `You are the shop assistant for one Delhaize shelf. You only talk about food, cooking, and products in the catalog. If the shopper talks about anything else, bring them back to what they want to cook.

Reply with JSON only, no markdown:
{"say":"","options":[],"missing":[],"baskets":null}

say is one or two short sentences in plain English. Write for a shopper, not a chef. If baskets are set, say must not be a question.
Never write "rice, pasta, and meat" or "rice pasta meat" unless they asked for those foods. Say "groceries".
options is [] almost always. Never a list of products, days, or allergies.
missing lists foods they asked for that are not in the catalog. This shelf has no crab sticks, surimi, lettuce, or mayonnaise. Never invent a sku.

The usual job is filling the fridge with groceries. Do not make a meal plan, name days, or assign breakfast, lunch, and dinner unless they ask for a plan. If they ask to plan the week, plan meals, or decide what to cook, then make that plan in say and shop the ingredients. Otherwise never mention a plan or a day.
Never ask which day, which meal, or "add broccoli?". Never offer one product at a time. Never open with allergies. Only leave a food out when they have already named an allergy and the catalog column names it.

${allergenRule}
Shop what they asked for. A dinner is the foods they named, plus a substitute only when they asked for the closest safe one. Do not pad that into a full fridge. Use 8 to 12 products only when they say fill the fridge and name no foods. If they only say fill the fridge, choose a varied grocery shop yourself. Do not announce a fixed menu.
When they give amounts, do the math. Example: two weeks, 300g carbohydrates and 200g meat a day is about 4.2kg carbs and 2.8kg meat. Split the packs across foods that cover it. Do not ask them to confirm it.
Default period is about a week. Two weeks means more packs. qty is 1 to 6 packs of that product. Do not leave every qty at 1.

${baskets}
If they say basket, gimme basket, or that's enough, the baskets are required in that reply, built from foods already named. Do not ask them to repeat the shop.
Use only skus from the catalog. A later message updates those baskets. If the message says it is a new order, do not copy the earlier basket. Follow that note.

Catalog lines are sku|name|pack|price|allergens:
${catalog}`;
}

function cleanItems(items) {
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      sku: String(item?.sku || '').trim(),
      role: String(item?.role || '').trim(),
      qty: Math.min(6, Math.max(1, Math.round(Number(item?.qty) || 1))),
    }))
    .filter((item) => item.sku && !seen.has(item.sku) && seen.add(item.sku));
}

function parseReply(text, basketCount) {
  const source = String(text || '').trim();
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start === -1 || end === -1) {
    return { say: source.slice(0, 420), options: [], missing: [], baskets: null };
  }
  let reply;
  try {
    reply = JSON.parse(source.slice(start, end + 1));
  } catch (err) {
    return { say: '', options: [], missing: [], baskets: null, broken: true };
  }
  const options = (Array.isArray(reply.options) ? reply.options : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 4);
  const missing = (Array.isArray(reply.missing) ? reply.missing : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);
  const rawBaskets = Array.isArray(reply.baskets) ? reply.baskets.slice(0, basketCount) : [];
  const baskets = rawBaskets
    .map((basket) => ({
      title: String(basket?.title || 'Basket').trim(),
      pitch: String(basket?.pitch || '').trim(),
      items: cleanItems(basket?.items),
    }))
    .filter((basket) => basket.items.length >= 1);
  return {
    say: String(reply.say || '').trim() || 'Here is what I can do with this shelf.',
    options: baskets.length ? [] : options,
    missing,
    baskets: baskets.length ? baskets : null,
  };
}

function wantsBasket(request) {
  return /\b(basket|baskets|checkout|that'?s enough|i'?m done|gimme|give me)\b/i.test(request);
}

function attachProducts(reply, products) {
  if (!reply.baskets) return reply;
  const bySku = new Map(products.map((product) => [product.sku, product]));
  const baskets = reply.baskets.map((basket) => ({
    ...basket,
    items: basket.items
      .filter((item) => bySku.has(item.sku))
      .map((item) => ({ ...item, product: bySku.get(item.sku) })),
  })).filter((basket) => basket.items.length >= 1);
  if (!baskets.length) {
    return {
      ...reply,
      baskets: null,
      say: 'Tell me what groceries you want and I will fill a basket.',
    };
  }
  return { ...reply, baskets };
}

function slim(reply) {
  return {
    say: reply.say,
    options: reply.options,
    missing: reply.missing,
    baskets: reply.baskets
      ? reply.baskets.map((basket) => ({
        title: basket.title,
        pitch: basket.pitch,
        items: basket.items.map(({ sku, qty, role }) => ({ sku, qty, role })),
      }))
      : null,
  };
}

async function complete(messages, signal) {
  const response = await fetch('/api/grok', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 2000,
      reasoning: { effort: 'none' },
      messages,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || `The assistant failed (${response.status}).`;
    throw new Error(typeof message === 'string' ? message : 'The assistant failed.');
  }
  return payload?.choices?.[0]?.message?.content || '';
}

function basketTotal(basket) {
  return basket.items.reduce((total, item) => total + (Number(item.product?.offers?.price) || 0) * (item.qty || 1), 0);
}

function allergenNote(product, table) {
  const raw = String(product.source?.allergenen || '').trim();
  const listed = (correctedBySku.get(product.sku)?.allergenen?.bevat || []).filter(Boolean);
  const useless = !raw || raw.toLowerCase() === 'zie etiket';
  if (table === 'old') {
    if (useless && listed.length) {
      const cell = raw ? `Cell says "${raw}".` : 'Allergen cell empty.';
      return { allergenNote: `${cell} Corrected lists ${listed.join(', ')}.`, allergenMissing: true };
    }
    return { allergenNote: raw || 'None on the sheet', allergenMissing: false };
  }
  return {
    allergenNote: listed.length ? listed.join(', ') : 'None listed',
    allergenMissing: false,
  };
}

function stamp(basket, band, table) {
  return {
    ...basket,
    band,
    table,
    items: basket.items.map((item) => ({ ...item, ...allergenNote(item.product, table) })),
  };
}

function blocks(product, avoidIds) {
  if (!avoidIds.length || !product) return false;
  const present = new Set([
    ...(product.allergen?.contains || []),
    ...(product.other_risks || []).map((risk) => risk.id),
    ...(correctedBySku.get(product.sku)?.allergenen?.bevat || []),
  ]);
  return avoidIds.some((id) => present.has(id));
}

async function askOne({ products, catalog, turns, request, orderNote, signal, side, basketCount, avoidIds }) {
  const messages = [{ role: 'system', content: systemPrompt(catalog, basketCount) }];
  turns.forEach((turn) => {
    messages.push({ role: 'user', content: turn.request });
    const previous = turn.reply?.sides?.[side];
    if (previous) messages.push({ role: 'assistant', content: JSON.stringify(slim(previous)) });
  });
  let content = orderNote ? `${request}\n\n${orderNote}` : request;
  if (avoidIds.length) {
    const named = avoidIds.join(', ');
    content += side === 'corrected'
      ? `\n\nShelf filter is on: ${named}. Do not include a product whose allergen column lists any of these.`
      : `\n\nThe shopper named these allergies: ${named}. Leave a product out only when this catalog's allergen column names that allergy. empty and zie etiket do not.`;
  }
  const shopNow = wantsBasket(request) || request.length > 40;
  const countLine = basketCount === 2 ? 'Exactly two baskets.' : 'Exactly one basket.';
  if (shopNow) {
    content += `\n\nShop now. JSON only. ${countLine} options []. No questions.`;
  }
  messages.push({ role: 'user', content });

  let reply = attachProducts(parseReply(await complete(messages, signal), basketCount), products);
  if (reply.broken || (shopNow && (!reply.baskets || reply.baskets.length < basketCount))) {
    messages.push({
      role: 'user',
      content: `Reply again with JSON only. ${countLine} Use the foods they named. Use 8 to 12 skus only for a fridge fill. options []. Do not ask a question.`,
    });
    reply = attachProducts(parseReply(await complete(messages, signal), basketCount), products);
  }
  if (reply.broken || !reply.say) {
    reply = {
      ...reply,
      broken: false,
      say: reply.baskets ? 'Here is a basket of groceries.' : 'Ask for the basket and I will shop what you already named.',
    };
  }
  return reply;
}

function withoutAvoided(reply, avoidIds) {
  if (!reply.baskets || !avoidIds.length) return reply;
  const baskets = reply.baskets
    .map((basket) => ({
      ...basket,
      items: basket.items.filter((item) => !blocks(item.product, avoidIds)),
    }))
    .filter((basket) => basket.items.length >= 1);
  return { ...reply, baskets: baskets.length ? baskets : null };
}

async function askMeal({ products, turns, request, orderNote, signal, avoidIds = [] }) {
  const safeProducts = avoidIds.length
    ? products.filter((product) => !blocks(product, avoidIds))
    : products;
  const [oldReply, fixedReply] = await Promise.all([
    askOne({
      products,
      catalog: rawCatalogOf(products),
      turns,
      request,
      orderNote,
      signal,
      side: 'old',
      basketCount: 1,
      avoidIds,
    }),
    askOne({
      products,
      catalog: catalogOf(safeProducts),
      turns,
      request,
      orderNote,
      signal,
      side: 'corrected',
      basketCount: 2,
      avoidIds,
    }),
  ]);
  const sides = { old: oldReply, corrected: fixedReply };
  const kept = withoutAvoided(fixedReply, avoidIds);
  const oldBasket = oldReply.baskets?.[0];
  const fixed = (kept.baskets || []).slice().sort((a, b) => basketTotal(a) - basketTotal(b));
  const baskets = [
    oldBasket ? stamp(oldBasket, 'Old table', 'old') : null,
    fixed[0] ? stamp(fixed[0], fixed[1] ? 'Cheaper' : 'Corrected', 'corrected') : null,
    fixed[1] ? stamp(fixed[1], 'More expensive', 'corrected') : null,
  ].filter(Boolean);
  if (!baskets.length) {
    return {
      say: fixedReply.say || oldReply.say,
      options: fixedReply.options || [],
      missing: fixedReply.missing || [],
      baskets: null,
      sides,
    };
  }
  return {
    say: fixedReply.say,
    options: [],
    missing: fixedReply.missing || [],
    baskets,
    sides,
  };
}

module.exports = { askMeal };

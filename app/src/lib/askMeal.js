const MODEL = 'grok-4.3';

function packOf(qty) {
  if (!qty || qty.value == null) return '';
  if (qty.unit === 'g') return qty.value >= 1000 ? `${qty.value / 1000}kg` : `${qty.value}g`;
  if (qty.unit === 'ml') return qty.value >= 1000 ? `${qty.value / 1000}L` : `${qty.value}ml`;
  return `${qty.value}pc`;
}

function catalogOf(products) {
  return products.map((product) => {
    const contains = product.allergen.contains.join('+');
    const gluten = product.allergen.gluten === 'unknown' ? 'gluten?' : '';
    return [product.sku, product.name, packOf(product.net_quantity), Number(product.offers.price).toFixed(2), contains, gluten]
      .filter(Boolean)
      .join('|');
  }).join('\n');
}

function systemPrompt(products) {
  return `You are the shop assistant for one Delhaize shelf. You only talk about food, cooking, and products in the catalog. If the shopper talks about anything else, bring them back to what they want to cook.

Reply with JSON only, no markdown:
{"say":"","options":[],"missing":[],"baskets":null}

say is one or two short sentences in plain English. Write for a shopper, not a chef. If baskets are set, say must not be a question. pitch is one short line, such as "The smaller shop" or "More groceries".
Never write "rice, pasta, and meat" or "rice pasta meat" unless they asked for those foods. Say "groceries".
options is [] almost always. Never a list of products, days, or allergies.
missing lists foods they asked for that are not in the catalog. This shelf has no crab sticks, surimi, lettuce, or mayonnaise. Never invent a sku.

The usual job is filling the fridge with groceries. Do not make a meal plan, name days, or assign breakfast, lunch, and dinner unless they ask for a plan. If they ask to plan the week, plan meals, or decide what to cook, then make that plan in say and shop the ingredients. Otherwise never mention a plan or a day.
Never ask which day, which meal, or "add broccoli?". Never offer one product at a time. Never open with allergies. Only leave a food out when they have already named an allergy.

If they name foods, a period, or daily amounts, the reply includes two baskets. If they only say fill the fridge, choose a varied grocery shop yourself. Do not announce a fixed menu.
When they give amounts, do the math. Example: two weeks, 300g carbohydrates and 200g meat a day is about 4.2kg carbs and 2.8kg meat. Split the packs across foods that cover it. Do not ask them to confirm it.
Default period is about a week. Two weeks means more packs. qty is 1 to 6 packs of that product. Do not leave every qty at 1.

Two baskets. The first spends less. The second is a fuller fridge. 8 to 12 products each.
{"baskets":[{"title":"","pitch":"","items":[{"sku":"","qty":1,"role":""}]}]}
If they say basket, gimme basket, or that's enough, baskets are required in that reply, built from foods already named. Do not ask them to repeat the shop.
Use only skus from the catalog. A later message updates both baskets. If the message says it is a new order, do not copy the earlier baskets. Follow that note.

Catalog lines are sku|name|pack|price|contains:
${catalogOf(products)}`;
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

function parseReply(text) {
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
  const rawBaskets = Array.isArray(reply.baskets) ? reply.baskets.slice(0, 2) : [];
  const baskets = rawBaskets
    .map((basket) => ({
      title: String(basket?.title || 'Basket').trim(),
      pitch: String(basket?.pitch || '').trim(),
      items: cleanItems(basket?.items),
    }))
    .filter((basket) => basket.items.length >= 6);
  return {
    say: String(reply.say || '').trim() || 'Here is what I can do with this shelf.',
    options: baskets.length === 2 ? [] : options,
    missing,
    baskets: baskets.length === 2 ? baskets : null,
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
  })).filter((basket) => basket.items.length >= 6);
  if (baskets.length < 2) {
    return {
      ...reply,
      baskets: null,
      say: 'Tell me what groceries you want and I will fill two baskets.',
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

async function askMeal({ products, turns, request, orderNote, signal }) {
  const messages = [{ role: 'system', content: systemPrompt(products) }];
  turns.forEach((turn) => {
    messages.push({ role: 'user', content: turn.request });
    if (turn.reply) messages.push({ role: 'assistant', content: JSON.stringify(slim(turn.reply)) });
  });
  let content = orderNote ? `${request}\n\n${orderNote}` : request;
  const shopNow = wantsBasket(request) || (request.length > 80 && !/\ballerg/i.test(request));
  if (shopNow) {
    content += '\n\nShop now. JSON only. Exactly two baskets. options []. No questions.';
  }
  messages.push({ role: 'user', content });

  let reply = attachProducts(parseReply(await complete(messages, signal)), products);
  if (reply.broken || (shopNow && !reply.baskets)) {
    messages.push({
      role: 'user',
      content: 'Reply again with JSON only. Exactly two baskets, 8 to 12 catalog skus each. options []. Do not ask a question.',
    });
    reply = attachProducts(parseReply(await complete(messages, signal)), products);
  }
  if (reply.broken || !reply.say) {
    reply = {
      ...reply,
      broken: false,
      say: reply.baskets ? 'Here are two baskets of groceries.' : 'Ask for the basket and I will shop what you already named.',
    };
  }
  return reply;
}

module.exports = { askMeal };

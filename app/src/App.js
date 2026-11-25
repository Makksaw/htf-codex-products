import { useEffect, useMemo, useRef, useState } from 'react';
import rows from './data/rows.json';
import { askMeal } from './lib/askMeal';
import { enrichAll } from './lib/engine';
import { pictureFor } from './lib/pictures';
import './App.css';

const STARTS = [
  { label: 'Fill the fridge', text: 'Fill the fridge with groceries.' },
  { label: 'Plan the week', text: 'Plan what I will cook this week, then shop the groceries.' },
  { label: 'I have an allergy', text: 'I have an allergy.' },
];
const GREETING = 'What groceries should go in the fridge?';
const CATEGORY_RANK = ['Pasta', 'Sauces', 'Vegetables', 'Grains', 'Meat', 'Fish', 'Protein', 'Dairy', 'Eggs', 'Bakery', 'Breakfast', 'Pantry', 'World kitchen', 'Baking', 'Snacks', 'Frozen', 'Ready meals', 'Drinks'];

function categoryName(product) {
  const parts = String(product.category_path || 'Other').split(' > ').filter((part) => part && part !== 'Food');
  return parts[0] || 'Other';
}

function money(value) {
  if (!Number.isFinite(value)) return '—';
  return `€${value.toFixed(2).replace('.', ',')}`;
}

function qtyLabel(qty) {
  if (!qty || qty.value == null) return qty?.raw || '';
  if (qty.unit === 'g') return qty.value >= 1000 ? `${qty.value / 1000} kg` : `${qty.value} g`;
  if (qty.unit === 'ml') return qty.value >= 1000 ? `${qty.value / 1000} L` : `${qty.value} ml`;
  return `${qty.value} pc`;
}

function lineTotal(item) {
  return (item.product.offers.price || 0) * (item.qty || 1);
}

function sum(basket) {
  return basket.items.reduce((total, item) => total + lineTotal(item), 0);
}

function units(basket) {
  return basket.items.reduce((total, item) => total + (item.qty || 1), 0);
}

const BASKET_KEY = 'delhaize-basket';

function readBasket(products) {
  try {
    const raw = localStorage.getItem(BASKET_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const bySku = new Map(products.map((product) => [product.sku, product]));
    const items = (Array.isArray(saved.items) ? saved.items : [])
      .map((item) => {
        const product = bySku.get(item?.sku);
        if (!product) return null;
        return {
          sku: product.sku,
          qty: Math.min(9, Math.max(1, Math.round(Number(item.qty) || 1))),
          role: String(item.role || ''),
          product,
        };
      })
      .filter(Boolean);
    if (!items.length) return null;
    return {
      band: saved.band || 'Yours',
      title: saved.title || 'Your order',
      pitch: saved.pitch || '',
      items,
    };
  } catch (err) {
    return null;
  }
}

function writeBasket(basket) {
  if (!basket) {
    localStorage.removeItem(BASKET_KEY);
    return;
  }
  localStorage.setItem(BASKET_KEY, JSON.stringify({
    band: basket.band,
    title: basket.title,
    pitch: basket.pitch,
    items: basket.items.map(({ sku, qty, role }) => ({ sku, qty: qty || 1, role: role || '' })),
  }));
}

function withBands(reply) {
  if (!reply.baskets) return reply;
  const baskets = [...reply.baskets].sort((a, b) => sum(a) - sum(b));
  const priced = sum(baskets[0]) + 0.009 < sum(baskets[1]);
  return {
    ...reply,
    baskets: baskets.map((basket, index) => ({
      ...basket,
      band: priced ? (index === 0 ? 'Lower' : 'Higher') : `Basket ${index + 1}`,
    })),
  };
}

function shelfMatch(product, query) {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  const hay = `${product.name} ${product.name_en} ${product.category_path} ${product.brand}`.toLowerCase();
  if (hay.includes(text)) return true;
  const words = text.split(/[^a-z0-9à-ÿ]+/i).filter((word) => word.length > 3);
  return words.some((word) => hay.includes(word));
}

function useDictation(onText) {
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState('');
  const recRef = useRef(null);

  function stop() {
    recRef.current?.stop();
    setListening(false);
  }

  function start() {
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Ctor) {
      setNote('This browser cannot take dictation.');
      return;
    }
    setNote('');
    const rec = new Ctor();
    rec.lang = navigator.language || 'nl-BE';
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = '';
    rec.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += piece;
        else interim += piece;
      }
      onText((finalText || interim).trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  return { listening, note, toggle: listening ? stop : start };
}

function App() {
  const products = useMemo(() => enrichAll(rows).products, []);
  const [shelfQuery, setShelfQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [basket, setBasket] = useState(() => readBasket(products));
  const [basketOpen, setBasketOpen] = useState(false);
  const [product, setProduct] = useState(null);
  const [picked, setPicked] = useState({});
  const [open, setOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [includeLast, setIncludeLast] = useState(null);
  const [askingInclude, setAskingInclude] = useState(false);
  const askRef = useRef(null);
  const threadRef = useRef(null);
  const dockRef = useRef(null);
  const panelRef = useRef(null);
  const [panelHeight, setPanelHeight] = useState(0);
  const dictation = useDictation(setDraft);
  const categories = useMemo(() => {
    const present = new Set(products.map(categoryName));
    return CATEGORY_RANK.filter((name) => present.has(name));
  }, [products]);
  const shelf = useMemo(() => products.filter((item) => (
    (category === 'All' || categoryName(item) === category) && shelfMatch(item, shelfQuery)
  )), [products, category, shelfQuery]);
  useEffect(() => () => askRef.current?.abort(), []);

  useEffect(() => {
    writeBasket(basket);
  }, [basket]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !open) {
      setPanelHeight(0);
      return undefined;
    }
    const measure = () => {
      const cap = Math.min(window.innerHeight * 0.62, 560);
      const next = Math.min(panel.scrollHeight, cap);
      setPanelHeight((current) => (current === next ? current : next));
      const node = threadRef.current;
      if (node) node.scrollTop = node.scrollHeight;
    };
    measure();
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [open, messages, pending, error]);

  useEffect(() => {
    function onPointer(event) {
      if (pending || basketOpen) return;
      if (dockRef.current && !dockRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [pending, basketOpen]);

  function qtyKey(messageIndex, band, sku) {
    return `${messageIndex}:${band}:${sku}`;
  }

  function qtyOf(messageIndex, band, item) {
    const chosen = picked[qtyKey(messageIndex, band, item.sku)];
    return chosen || item.qty || 1;
  }

  function changeQty(messageIndex, band, sku, next) {
    setPicked((current) => ({ ...current, [qtyKey(messageIndex, band, sku)]: next }));
  }

  function orderNote() {
    if (!lastOrder || includeLast == null) return '';
    const lines = lastOrder.items.map((item) => `${item.sku}|${item.product.name}|${item.qty}`).join(', ');
    if (includeLast) {
      return `This is a new order. Keep every one of these products in both baskets, at least at these quantities: ${lines}. Add whatever else they ask for. Do not ask which day.`;
    }
    return `This is a new order. Do not reuse the previous basket (${lines}). Shop only what they ask for now.`;
  }

  function mergeOrder(reply) {
    if (!includeLast || !lastOrder || !reply.baskets) return reply;
    return {
      ...reply,
      baskets: reply.baskets.map((offer) => {
        const items = offer.items.map((item) => {
          const kept = lastOrder.items.find((line) => line.sku === item.sku);
          return kept ? { ...item, qty: Math.max(item.qty || 1, kept.qty || 1) } : item;
        });
        const present = new Set(items.map((item) => item.sku));
        lastOrder.items.forEach((item) => {
          if (!present.has(item.sku)) items.unshift({ ...item });
        });
        return { ...offer, items };
      }),
    };
  }

  async function send(text) {
    const request = text.trim();
    if (!request || pending || askingInclude) return;
    if (dictation.listening) dictation.toggle();
    setDraft('');
    setError('');
    setOpen(true);
    setPending(true);
    const history = messages.filter((message) => message.request);
    const note = orderNote();
    setMessages((current) => [...current, { request, reply: null }]);
    askRef.current?.abort();
    const controller = new AbortController();
    askRef.current = controller;
    try {
      const reply = withBands(mergeOrder(await askMeal({
        products,
        turns: history,
        request,
        orderNote: note,
        signal: controller.signal,
      })));
      setMessages((current) => current.map((message, index) => (
        index === current.length - 1 ? { request, reply } : message
      )));
    } catch (err) {
      if (err.name === 'AbortError') return;
      setMessages((current) => current.filter((message) => message.reply || message.request !== request));
      setError(err.message || 'The assistant failed.');
    } finally {
      setPending(false);
    }
  }

  function placeOrder() {
    if (!basket) return;
    const placed = {
      title: basket.title,
      band: basket.band,
      items: basket.items.map((item) => ({ ...item, qty: item.qty || 1 })),
    };
    setReceipt(placed);
    setLastOrder({ title: placed.title, items: placed.items });
    setBasket(null);
    setBasketOpen(false);
    if (askingInclude || pending) return;
    setIncludeLast(null);
    setAskingInclude(true);
    setOpen(true);
    setMessages((current) => [...current, {
      request: '',
      reply: {
        say: `Order placed (${money(sum(placed))}). Include those products in the next order?`,
        options: ['Yes, include them', 'No, start fresh'],
        missing: [],
        baskets: null,
        gate: true,
      },
    }]);
  }

  function emptyBasket() {
    setBasket(null);
    setReceipt(null);
  }

  function answerInclude(label) {
    const yes = label.startsWith('Yes');
    setIncludeLast(yes);
    setAskingInclude(false);
    setOpen(true);
    setMessages((current) => [...current, {
      request: label,
      reply: {
        say: yes
          ? 'Those stay in. Add whatever else you want, or take a basket.'
          : 'Fresh start. Tell me what groceries you want.',
        options: [],
        missing: [],
        baskets: null,
      },
    }]);
  }

  function addProduct(item) {
    setBasket((current) => {
      if (!current) {
        return {
          band: 'Yours',
          title: 'Your order',
          pitch: '',
          items: [{ sku: item.sku, qty: 1, role: '', product: item }],
        };
      }
      const existing = current.items.find((line) => line.sku === item.sku);
      if (existing) {
        return {
          ...current,
          items: current.items.map((line) => (
            line.sku === item.sku ? { ...line, qty: Math.min(9, (line.qty || 1) + 1) } : line
          )),
        };
      }
      return {
        ...current,
        items: [...current.items, { sku: item.sku, qty: 1, role: '', product: item }],
      };
    });
  }

  function takeBasket(offer, messageIndex) {
    setBasket({
      ...offer,
      items: offer.items.map((item) => ({ ...item, qty: qtyOf(messageIndex, offer.band, item) })),
    });
    setBasketOpen(true);
  }

  function setBasketQty(sku, next) {
    setBasket((current) => current && ({
      ...current,
      items: current.items.map((item) => (item.sku === sku ? { ...item, qty: next } : item)),
    }));
  }

  return (
    <div className="shop">
      <header className="bar">
        <div className="brand">
          <span>Delhaize</span>
        </div>
        <input
          className="shelf-search"
          value={shelfQuery}
          onChange={(event) => setShelfQuery(event.target.value)}
          placeholder="Search the shelf"
          aria-label="Search the shelf"
        />
        <button type="button" className={basket ? 'basket-chip on' : 'basket-chip'} onClick={() => setBasketOpen(true)}>
          <Bag />
          <span>Basket</span>
          {basket && <b>{units(basket)} · {money(sum(basket))}</b>}
        </button>
      </header>

      <main className="shelf" aria-label="On the shelf">
        <header>
          <h1>On the shelf</h1>
          <span>{shelf.length}</span>
        </header>
        <nav className="cats" aria-label="Categories">
          <button type="button" className={category === 'All' ? 'on' : ''} onClick={() => setCategory('All')}>All</button>
          {categories.map((name) => (
            <button key={name} type="button" className={category === name ? 'on' : ''} onClick={() => setCategory(name)}>{name}</button>
          ))}
        </nav>
        {shelf.length === 0 && <p className="empty">Nothing on the shelf matches that.</p>}
        <ul className="grid">
          {shelf.map((item) => (
            <li key={item.sku}>
              <button
                type="button"
                className="card"
                onClick={() => setProduct(item)}
              >
                <img src={pictureFor(item.sku)} alt="" />
                <span className="card-body">
                  <strong>{item.name}</strong>
                  <em>{qtyLabel(item.net_quantity)}</em>
                  <span className="foot">
                    <small>{item.allergen.contains.join(', ')}</small>
                    <b>{money(item.offers.price)}</b>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </main>

      <div
        className={`dock${open ? ' open' : ''}${basketOpen ? ' beside' : ''}`}
        ref={dockRef}
        onPointerDown={() => setOpen(true)}
      >
        <div className="dock-body" style={{ height: panelHeight }} aria-hidden={!open}>
          <div className="dock-panel" ref={panelRef}>
          <header className="assist-head">
            <div>
              <h1>Assistant</h1>
              <p>Groceries for the fridge.</p>
            </div>
            <button
              type="button"
              className="close"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </header>
          <div className="thread" ref={threadRef}>
            <article className="bubble bot">
              <p>{GREETING}</p>
              {messages.length === 0 && (
                <div className="chips">
                  {STARTS.map((item) => (
                    <button key={item.label} type="button" onClick={() => send(item.text)}>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </article>
            {messages.map((message, index) => (
              <div key={`${message.request}-${index}`} className="turn">
                {message.request && <article className="bubble you"><p>{message.request}</p></article>}
                {message.reply && (
                  <article className="bubble bot">
                    <p>{message.reply.say}</p>
                    {message.reply.missing.length > 0 && (
                      <p className="missing">Not on this shelf: {message.reply.missing.join(', ')}.</p>
                    )}
                    {message.reply.options.length > 0 && (
                      <div className="chips">
                        {message.reply.options.map((label) => (
                          <button
                            key={label}
                            type="button"
                            disabled={pending}
                            onClick={() => (message.reply.gate ? answerInclude(label) : send(label))}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}
                    {message.reply.baskets && (
                      <div className="offers">
                        {message.reply.baskets.map((offer) => (
                          <section key={offer.band} className="offer">
                            <header>
                              <span>{offer.band}</span>
                              <b>{money(offer.items.reduce((total, item) => total + (item.product.offers.price || 0) * qtyOf(index, offer.band, item), 0))}</b>
                            </header>
                            <h2>{offer.title}</h2>
                            <p className="week">Groceries</p>
                            {offer.pitch && <p>{offer.pitch}</p>}
                            <ul>
                              {offer.items.map((item) => (
                                <li key={item.sku}>
                                  <button type="button" className="mini" onClick={() => setProduct(item.product)}>
                                    <img src={pictureFor(item.sku)} alt="" />
                                    <span>
                                      <strong>{item.product.name}</strong>
                                      <em>{qtyLabel(item.product.net_quantity)} · {money(item.product.offers.price)}</em>
                                    </span>
                                  </button>
                                  <Stepper
                                    value={qtyOf(index, offer.band, item)}
                                    onChange={(next) => changeQty(index, offer.band, item.sku, next)}
                                  />
                                </li>
                              ))}
                            </ul>
                            <button type="button" className="take" onClick={() => takeBasket(offer, index)}>
                              Use this basket
                            </button>
                          </section>
                        ))}
                      </div>
                    )}
                  </article>
                )}
              </div>
            ))}
            {pending && <Working />}
            {error && <p className="error">{error}</p>}
          </div>
          </div>
        </div>
        <form className="composer" onSubmit={(event) => { event.preventDefault(); send(draft); }}>
            <button
              type="button"
              className={dictation.listening ? 'mic live' : 'mic'}
              onClick={dictation.toggle}
              aria-pressed={dictation.listening}
              aria-label={dictation.listening ? 'Stop voice' : 'Voice'}
            >
              <Mic />
            </button>
            <input
              value={draft}
              onChange={(event) => { setDraft(event.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder={askingInclude ? 'Choose yes or no above' : 'Groceries, or a meal plan…'}
              aria-label="What groceries do you want"
            />
            <button type="submit" className="send" disabled={pending || askingInclude || !draft.trim()}>Send</button>
            {dictation.note && <p className="dock-note">{dictation.note}</p>}
          </form>
      </div>

      {product && <Sheet item={product} onClose={() => setProduct(null)} onAdd={addProduct} />}
      {basketOpen && (
        <BasketDrawer
          basket={basket}
          receipt={receipt}
          onClose={() => setBasketOpen(false)}
          onOpen={setProduct}
          onQty={setBasketQty}
          onEmpty={emptyBasket}
          onOrder={placeOrder}
        />
      )}
    </div>
  );
}

function Stepper({ value, onChange }) {
  return (
    <span className="stepper">
      <button type="button" aria-label="Fewer" onClick={() => onChange(Math.max(1, value - 1))}>−</button>
      <b>{value}</b>
      <button type="button" aria-label="More" onClick={() => onChange(Math.min(9, value + 1))}>+</button>
    </span>
  );
}

function Working() {
  const [dots, setDots] = useState(1);
  useEffect(() => {
    const id = setInterval(() => setDots((count) => (count % 3) + 1), 380);
    return () => clearInterval(id);
  }, []);
  return (
    <p className="reply" role="status">
      Looking through the shelf<span className="dots" aria-hidden="true">{'.'.repeat(dots)}</span>
    </p>
  );
}

function BasketDrawer({ basket, receipt, onClose, onOpen, onQty, onEmpty, onOrder }) {
  const shown = basket || receipt;
  const placed = Boolean(receipt && !basket);
  return (
    <div className="overlay" onClick={onClose}>
      <article className="sheet basket-sheet" role="dialog" aria-label={placed ? 'Order placed' : 'Basket'} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="close" onClick={onClose}>Close</button>
        <header className="basket-head">
          <h2>{placed ? 'Order placed' : 'Basket'}</h2>
          {basket && (
            <button type="button" className="empty-basket" onClick={onEmpty}>
              <Trash />
              Empty basket
            </button>
          )}
        </header>
        {!shown && <p>Take a basket from the chat, or add a product from its card.</p>}
        {shown && (
          <>
            <p className="path">{placed ? 'Packed' : `${shown.band} · ${shown.title}`}</p>
            <p className="price">{money(sum(shown))}</p>
            <ul className="basket-lines">
              {shown.items.map((item) => (
                <li key={item.sku}>
                  <button type="button" className="line" onClick={() => onOpen(item.product)}>
                    <img src={pictureFor(item.sku)} alt="" />
                    <span>
                      <strong>{item.product.name}</strong>
                      <em>{item.qty || 1} × {qtyLabel(item.product.net_quantity)} · {money(lineTotal(item))}</em>
                    </span>
                  </button>
                  {basket && <Stepper value={item.qty || 1} onChange={(next) => onQty(item.sku, next)} />}
                </li>
              ))}
            </ul>
            {basket && <button type="button" className="take" onClick={onOrder}>Order now</button>}
          </>
        )}
      </article>
    </div>
  );
}

function containsLine(item) {
  const found = item.allergen.contains;
  if (item.allergen.label_status === 'empty' && !found.length) return 'Unknown. The allergen cell is empty.';
  if (!found.length && item.allergen.label_status === 'declared_none') return 'None declared on the label.';
  return found.join(', ') || 'Unknown.';
}

function Sheet({ item, onClose, onAdd }) {
  const unknown = [];
  if (item.allergen.gluten === 'unknown') unknown.push('Gluten is not stated.');
  if (item.diet.vegetarian == null) unknown.push('Vegetarian is not stated.');
  if (item.diet.pork == null) unknown.push('Pork is not stated.');
  return (
    <div className="overlay" onClick={onClose}>
      <article className="sheet" role="dialog" aria-label={item.name} onClick={(event) => event.stopPropagation()}>
        <button type="button" className="close" onClick={onClose}>Close</button>
        <img src={pictureFor(item.sku)} alt="" />
        <p className="path">{item.category_path}</p>
        <h2>{item.name}</h2>
        <p className="en">{item.name_en}</p>
        <p className="price">{money(item.offers.price)} <span>{qtyLabel(item.net_quantity)}</span></p>
        <button type="button" className="take" onClick={() => onAdd(item)}>Add to basket</button>
        {item.description && <p>{item.description}</p>}
        <dl>
          <div>
            <dt>Contains</dt>
            <dd>{containsLine(item)}</dd>
          </div>
          <div>
            <dt>May contain</dt>
            <dd>{item.allergen.may_contain.join(', ') || 'Not stated'}</dd>
          </div>
          <div>
            <dt>Ingredients</dt>
            <dd>{item.source.ingredienten || 'Not stated'}</dd>
          </div>
        </dl>
        {unknown.length > 0 && (
          <ul className="unknown">
            {unknown.map((line) => <li key={line}>{line}</li>)}
          </ul>
        )}
      </article>
    </div>
  );
}

function Trash() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.2 4.5h9.6M6.2 4.5V3.2h3.6v1.3M4.4 4.5l.6 8.2h6l.6-8.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Bag() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 5.5h8l-.7 8.2a1 1 0 0 1-1 .8H5.7a1 1 0 0 1-1-.8L4 5.5Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 5.5V4a2 2 0 0 1 4 0v1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

function Mic() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="6" y="1.5" width="4" height="8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3.5 7.5a4.5 4.5 0 0 0 9 0M8 12v2" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export default App;

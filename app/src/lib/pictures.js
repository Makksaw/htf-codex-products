function pictureFor(sku) {
  return `/products/${sku}.jpg`;
}

module.exports = { pictureFor };

export class MushafRenderer {
  constructor(container, onPage) { this.container = container; this.onPage = onPage; this.cache = new Map(); this.page = null; this.nodes = new Map(); }
  async preload(page) {
    if (!page || page > 604 || this.cache.has(page)) return;
    const url = `assets/mushaf/${String(page).padStart(3, '0')}.svg`;
    const response = await (await caches.open('recitation-core')).match(url);
    if (!response.ok) throw Error('تعذر تحميل صفحة المصحف');
    this.cache.set(page, await response.text());
    if (this.cache.size > 4) this.cache.delete(this.cache.keys().next().value);
  }
  async show(page, words) {
    await this.preload(page);
    const doc = new DOMParser().parseFromString(this.cache.get(page), 'image/svg+xml');
    if (doc.querySelector('parsererror')) throw Error('ملف المصحف غير صالح');
    const svg = document.importNode(doc.documentElement, true);
    svg.removeAttribute('width'); svg.removeAttribute('height');
    this.container.replaceChildren(svg);
    this.nodes.clear(); this.page = page;
    const selected = new Map(words.filter(w => w.page === page).map(w => [w.key, w]));
    for (const group of svg.querySelectorAll('[id^="md-word-"][data-surah][data-aya][data-word-index-in-ayah]')) {
      if (group.getAttribute('data-type') !== 'text') continue;
      const key = `${Number(group.dataset.surah)}:${Number(group.dataset.aya)}:${Number(group.dataset.wordIndexInAyah)}`;
      const word = selected.get(key);
      if (!word) continue;
      this.nodes.set(key, group);
      if (word.revealed) group.classList.add('revealed');
      if (word.state === 'incorrect-placeholder' || word.revealedByErrorLimit) this.overlay(group, word.revealedByErrorLimit ? 'revealed-error' : 'error');
    }
    this.onPage?.(page);
    this.preload(page + 1).catch(() => {});
  }
  overlay(group, kind) {
    group.parentNode.querySelector(`.word-overlay[data-for="${group.id}"]`)?.remove();
    const box = group.getBBox();
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', box.x - 1); rect.setAttribute('y', box.y - 1);
    rect.setAttribute('width', Math.max(box.width + 2, 5)); rect.setAttribute('height', Math.max(box.height + 2, 5));
    rect.setAttribute('rx', 1.5); rect.dataset.for = group.id; rect.setAttribute('class', `word-overlay ${kind}`);
    group.before(rect);
  }
  update(word, active = false) {
    const group = this.nodes.get(word.key); if (!group) return;
    group.classList.toggle('revealed', word.revealed);
    group.parentNode.querySelector(`.word-overlay[data-for="${group.id}"]`)?.remove();
    if (active) this.overlay(group, 'active');
    else if (word.revealedByErrorLimit) this.overlay(group, 'revealed-error');
    else if (word.state === 'incorrect-placeholder') this.overlay(group, 'error');
  }
}

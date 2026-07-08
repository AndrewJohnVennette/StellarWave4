class GEV_ShowItems extends HTMLElement {
  constructor(){
    super();
  }
  static get observedAttributes() {
    return ['data-json'];
  }

  connectedCallback() {
    this.#injectStyles();

    // SSR / hydration check: if <article> elements are already present
    // (e.g. rendered server-side), leave them as-is rather than overwrite them.
    const alreadyRendered = this.querySelector('article') !== null;
    if (alreadyRendered) return;

    this.#renderFromAttribute();
  }

  // Re-render whenever the data-json attribute is set or updated —
  // this is what makes it work with data supplied *after* the element
  // is already in the page (e.g. once a DB/API response arrives).
  attributeChangedCallback(name) {
    if (name === 'data-json') this.#renderFromAttribute();
  }

  #renderFromAttribute() {
    const raw = this.getAttribute('data-json');
    if (!raw) return;

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      console.error('show-data: invalid JSON in data-json attribute.', err);
      return;
    }

    this.#renderPeople(data.people || []);
  }

  // Internal loop function that maps the JSON array to markup.
  #renderPeople(people) {
    this.innerHTML = people.map(person => `
      <article>
        <h3>Name: ${person.name}</h3>
        <p>Age: ${person.age}</p>
        <p>Job: ${person.job}</p>
      </article>
    `).join('');
  }

  // Injects scoped-by-selector styles once per page, regardless of how many
  // <show-data> instances exist.
  #injectStyles() {
    if (document.getElementById('show-data-styles')) return;

    const style = document.createElement('style');
    style.id = 'show-data-styles';
    style.textContent = `
      show-data article {
        display: block;
        font-family: system-ui, sans-serif;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 12px;
        max-width: 320px;
      }
      show-data h3 { margin: 0 0 8px; font-size: 18px; }
      show-data p { margin: 4px 0; color: #444; }
    `;
    document.head.appendChild(style);
  }
}

customElements.define('gev-showitems', GEV_ShowItems);

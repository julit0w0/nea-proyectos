/* Tarn · comportamiento de la tienda. Vanilla, sin librerías.
   Carrito y aviso de lanzamiento son una demostración: no se cobra ni se guarda nada. */
(() => {
  'use strict';

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
  const pesos = (n) => `$${n.toLocaleString('es-AR')}`;
  const ENVIO_GRATIS = 120000;

  /* ---------- Catálogo ---------- */
  const PRODUCTOS = [
    { id: 'cresta', nombre: 'Cortaviento Cresta', precio: 89000, img: 'p-cortaviento.jpg', colores: ['#FF4F1F', '#111111'], nuevo: true },
    { id: 'abra', nombre: 'Remera Abra', precio: 38000, img: 'p-remera.jpg', colores: ['#EDEBE6', '#6B6E70'] },
    { id: 'portezuelo', nombre: 'Chaleco Portezuelo 8 L', precio: 112000, img: 'p-chaleco.jpg', colores: ['#111111'], nuevo: true },
    { id: 'capa', nombre: 'Capa Impermeable', precio: 165000, img: 'p-impermeable.jpg', colores: ['#111111'], proximamente: true },
    { id: 'filo', nombre: 'Primera capa Filo', precio: 64000, img: 'p-primera-capa.jpg', colores: ['#6B6E70', '#111111'] },
    { id: 'pirca', nombre: 'Short Pirca', precio: 42000, img: 'p-short.jpg', colores: ['#FF4F1F', '#111111'] },
  ];

  function pintarGrilla() {
    $('[data-grilla]').innerHTML = PRODUCTOS.map((p) => {
      const marca = p.proximamente ? '<span class="nuevo">28 de noviembre</span>' : p.nuevo ? '<span class="nuevo">Nuevo</span>' : '';
      const chips = p.colores.map((c) => `<i style="--c:${c}"></i>`).join('');
      return `<li><a href="#producto"><div class="foto"><img src="assets/img/${p.img}" alt="${p.nombre}" loading="lazy"></div>
        <div><p class="nombre">${p.nombre}</p><div class="datos"><span>${pesos(p.precio)}</span><span class="chips">${chips}</span></div>${marca}</div></a></li>`;
    }).join('');
  }

  /* ---------- Ficha: color y talle ---------- */
  const eleccion = { color: 'Señal', talle: 'M' };
  function elegir(grupo, boton) {
    $$('button', grupo).forEach((b) => b.setAttribute('aria-pressed', String(b === boton)));
  }
  $$('.colores .color').forEach((b) => b.addEventListener('click', () => {
    elegir(b.parentElement, b);
    eleccion.color = b.dataset.color;
    $('[data-color-nombre]').textContent = eleccion.color;
  }));
  $$('[data-talles] button').forEach((b) => b.addEventListener('click', () => {
    elegir(b.parentElement, b);
    eleccion.talle = b.textContent;
  }));

  /* ---------- Carrito ---------- */
  const items = [];
  function abrirCarrito(abierto) {
    $('[data-carrito]').hidden = !abierto;
    $('[data-velo]').hidden = !abierto;
  }
  function pintarCarrito() {
    const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
    $('[data-cantidad]').textContent = String(items.reduce((s, i) => s + i.cantidad, 0));
    $('[data-items]').innerHTML = items.map((i) =>
      `<li><img src="assets/img/${i.img}" alt=""><div>${i.nombre}<small>${i.color} · Talle ${i.talle}</small><small>Cantidad: ${i.cantidad}</small></div><span>${pesos(i.precio * i.cantidad)}</span></li>`).join('');
    $('[data-subtotal]').textContent = pesos(total);
    const falta = ENVIO_GRATIS - total;
    $('[data-envio]').textContent = falta > 0 ? `Te faltan ${pesos(falta)} para el envío gratis.` : 'Tienes envío gratis.';
    $('[data-demo]').hidden = true;
  }
  $('[data-agregar]').addEventListener('click', () => {
    const p = PRODUCTOS[0];
    const existente = items.find((i) => i.color === eleccion.color && i.talle === eleccion.talle);
    if (existente) existente.cantidad += 1;
    else items.push({ ...p, color: eleccion.color, talle: eleccion.talle, cantidad: 1 });
    pintarCarrito();
    abrirCarrito(true);
  });
  $('[data-abrir-carrito]').addEventListener('click', () => { pintarCarrito(); abrirCarrito(true); });
  $('[data-cerrar-carrito]').addEventListener('click', () => abrirCarrito(false));
  $('[data-velo]').addEventListener('click', () => abrirCarrito(false));
  $('[data-finalizar]').addEventListener('click', () => { $('[data-demo]').hidden = false; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') abrirCarrito(false); });

  /* ---------- Aviso de lanzamiento ---------- */
  $('[data-avisame]').addEventListener('submit', (e) => {
    e.preventDefault();
    $('[data-avisame-ok]').hidden = false;
    e.target.reset();
  });

  pintarGrilla();
  pintarCarrito();
})();

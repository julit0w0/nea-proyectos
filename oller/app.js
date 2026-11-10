/* Oller · comportamiento. Vanilla, sin librerías.
   El sistema de consultas es una demostración: arma el mensaje y muestra el registro, sin enviar nada. */
(() => {
  'use strict';

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  /* ---------- Portada: la fachada pasa de la mañana a la tarde con el scroll ---------- */
  const portada = $('.portada');
  const capas = $$('[data-hora-img]');

  function pasarElDia() {
    const recorrido = portada.offsetHeight - window.innerHeight;
    const p = Math.min(1, Math.max(0, window.scrollY / recorrido));
    // mañana -> mediodía en la primera mitad, mediodía -> tarde en la segunda
    capas[1].style.opacity = String(Math.min(1, p * 2));
    capas[2].style.opacity = String(Math.max(0, p * 2 - 1));
    // Barra clara sobre la foto; fondo cal y texto oscuro al salir de la portada
    $('.barra').classList.toggle('clara', window.scrollY >= recorrido - 2);
  }

  /* ---------- La luz: tres horas del mismo ambiente ---------- */
  function mostrarLuz(i) {
    $$('[data-luz]').forEach((b) => b.setAttribute('aria-selected', String(Number(b.dataset.luz) === i)));
    $$('[data-luz-img]').forEach((img) => img.classList.toggle('activa', Number(img.dataset.luzImg) === i));
  }

  /* ---------- Unidades ---------- */
  const UNIDADES = [
    ['2A', 2, 52, 'Norte', '9 a 15 h'], ['2B', 3, 78, 'Este', '7 a 11 h'], ['4A', 2, 52, 'Norte', '9 a 15 h'],
    ['4C', 1, 38, 'Oeste', '14 a 19 h'], ['6B', 3, 78, 'Este', '7 a 11 h'], ['7A', 2, 54, 'Norte', '9 a 16 h'],
    ['8C', 2, 56, 'Oeste', '14 a 19 h'], ['10A', 3, 84, 'Norte', '9 a 16 h'], ['10C', 2, 56, 'Oeste', '13 a 19 h'],
    ['12B', 4, 112, 'Este', '7 a 12 h'], ['13A', 3, 86, 'Norte', '9 a 17 h'], ['14', 4, 140, 'Norte', 'todo el día'],
  ];
  const VENDIDAS = new Set(['2A', '4C', '6B', '12B']);
  const disponibles = () => UNIDADES.filter((u) => !VENDIDAS.has(u[0]));

  function pintarUnidades() {
    $('[data-unidades]').innerHTML = UNIDADES.map(([id, amb, m2, o, sol]) => {
      const vendida = VENDIDAS.has(id);
      const accion = vendida ? 'Vendida' : `<a href="#contacto" data-pedir="${id}">Visitar</a>`;
      return `<tr data-o="${o}" class="${vendida ? 'vendida' : ''}"><td>${id}</td><td>${amb} amb.</td><td>${m2} m²</td><td>${o}</td><td>${sol}</td><td>${accion}</td></tr>`;
    }).join('');
    $$('[data-pedir]').forEach((a) => a.addEventListener('click', () => { $('[data-v-unidad]').value = a.dataset.pedir; armarMensaje(); }));
  }

  function filtrar(o) {
    $$('[data-filtro] button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.o === o)));
    $$('[data-unidades] tr').forEach((tr) => tr.classList.toggle('oculta', o !== 'todas' && tr.dataset.o !== o));
  }

  /* ---------- Visitar: mensaje armado y registro de la consulta ---------- */
  function proximosDias() {
    const dias = [];
    const hoy = new Date();
    for (let i = 1; dias.length < 8; i++) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i);
      if (d.getDay() !== 0) dias.push(d);
    }
    return dias;
  }
  const textoDia = (d) => `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
  const unidadElegida = () => UNIDADES.find((u) => u[0] === $('[data-v-unidad]').value);

  function armarMensaje() {
    const [id, amb, m2, o] = unidadElegida();
    $('[data-v-mensaje]').textContent =
      `Hola, me interesa la unidad ${id} (${amb} ambientes, ${m2} m², orientación ${o.toLowerCase()}). ` +
      `¿Puedo visitarla el ${$('[data-v-dia]').value}, ${$('[data-v-hora]').value.toLowerCase()}?`;
    $('[data-v-registro]').hidden = true;
  }

  function prepararVisita() {
    $('[data-v-unidad]').innerHTML = disponibles()
      .map(([id, amb, , o]) => `<option value="${id}">${id} · ${amb} ambientes · ${o.toLowerCase()}</option>`).join('');
    $('[data-v-dia]').innerHTML = proximosDias().map((d) => `<option>${textoDia(d)}</option>`).join('');
    $('[data-v-unidad]').value = '7A';
    $$('[data-visita] select').forEach((s) => s.addEventListener('change', armarMensaje));
    armarMensaje();
  }

  function registrar(evento) {
    evento.preventDefault();
    const [id, , , o] = unidadElegida();
    const ahora = new Date();
    const datos = [
      ['Unidad', `${id} · ${o.toLowerCase()}`],
      ['Visita pedida', `${$('[data-v-dia]').value}, ${$('[data-v-hora]').value.toLowerCase()}`],
      ['Origen', 'Sitio web · Agendar visita'],
      ['Recibida', `${ahora.getHours()}:${String(ahora.getMinutes()).padStart(2, '0')} h`],
    ];
    $('[data-v-datos]').innerHTML = datos.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
    $('[data-v-registro]').hidden = false;
  }

  /* ---------- Arranque ---------- */
  pintarUnidades();
  prepararVisita();
  $$('[data-luz]').forEach((b) => b.addEventListener('click', () => mostrarLuz(Number(b.dataset.luz))));
  $$('[data-filtro] button').forEach((b) => b.addEventListener('click', () => filtrar(b.dataset.o)));
  $('[data-visita]').addEventListener('submit', registrar);
  mostrarLuz(0);
  let pendiente = false;
  window.addEventListener('scroll', () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => { pasarElDia(); pendiente = false; });
  }, { passive: true });
  pasarElDia();
})();

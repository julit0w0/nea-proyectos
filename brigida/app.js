/* Brígida v2 · comportamiento. Vanilla, sin librerías.
   Las reservas son una demostración: la disponibilidad se calcula en el navegador a partir de la fecha. */
(() => {
  'use strict';

  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => [...raiz.querySelectorAll(sel)];
  const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const DIAS_LARGO = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const HORAS = ['20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'];
  const ABIERTO = new Set([2, 3, 4, 5, 6]); // martes a sábado
  const hoy = new Date();
  const fecha = (base, suma) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + suma);
  const clave = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

  /* ---------- Fechas visibles ---------- */
  function rotularSemana() {
    // Domingo y lunes muestran la semana que viene; de martes a sábado, la semana en curso.
    const dia = hoy.getDay();
    const martes = dia <= 1 ? fecha(hoy, 2 - dia) : fecha(hoy, -(dia - 2));
    const sabado = fecha(martes, 4);
    const texto = martes.getMonth() === sabado.getMonth()
      ? `${martes.getDate()} al ${sabado.getDate()} de ${MESES_LARGO[sabado.getMonth()]}`
      : `${martes.getDate()} de ${MESES_LARGO[martes.getMonth()]} al ${sabado.getDate()} de ${MESES_LARGO[sabado.getMonth()]}`;
    $$('[data-semana]').forEach((el) => { el.textContent = texto; });
    $$('[data-fecha-hoy]').forEach((el) => {
      el.textContent = `${DIAS_LARGO[hoy.getDay()]} ${hoy.getDate()} de ${MESES_LARGO[hoy.getMonth()]}`;
    });
  }

  /* ---------- Libro de reservas (demostración) ---------- */
  const libro = $('[data-reserva]');
  const listo = $('[data-listo]', libro);
  const tomadas = new Map(); // "AAAA-M-D|HH:MM" -> mesas tomadas en esta visita
  const estado = { personas: 2, dia: null, hora: null };

  function proximosDias(cantidad) {
    const dias = [];
    for (let i = 0; dias.length < cantidad; i++) {
      const d = fecha(hoy, i);
      if (ABIERTO.has(d.getDay())) dias.push(d);
    }
    return dias;
  }

  function azar(texto) { // hash determinístico 0..1
    let h = 2166136261;
    for (let i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 1000) / 1000;
  }

  function mesasLibres(dia, hora) {
    const base = Math.floor(azar(`${clave(dia)}|${hora}`) * 5); // 0..4
    const exigencia = estado.personas >= 5 ? 2 : 0;
    const pico = hora === '21:00' || hora === '21:30' ? 1 : 0;
    return Math.max(0, base - exigencia - pico - (tomadas.get(`${clave(dia)}|${hora}`) || 0));
  }

  function pintarPersonas() {
    $('[data-personas]', libro).textContent = String(estado.personas);
    $('[data-personas-palabra]', libro).textContent = estado.personas === 1 ? 'persona' : 'personas';
    $('[data-menos]', libro).disabled = estado.personas <= 1;
    $('[data-mas]', libro).disabled = estado.personas >= 6;
  }

  function pintarTabla() {
    const dias = proximosDias(5);
    const cabeza = $('[data-dias]', libro);
    cabeza.replaceChildren(document.createElement('th'), ...dias.map((d) => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.innerHTML = `${DIAS[d.getDay()]} ${d.getDate()}<small>${MESES[d.getMonth()]}</small>`;
      return th;
    }));
    const cuerpo = $('[data-horas]', libro);
    cuerpo.replaceChildren(...HORAS.map((h) => {
      const fila = document.createElement('tr');
      const rotulo = document.createElement('td');
      rotulo.textContent = h;
      fila.append(rotulo, ...dias.map((d) => {
        const celda = document.createElement('td');
        const libres = mesasLibres(d, h);
        const est = libres === 0 ? 'completo' : libres === 1 ? 'ultima' : 'libre';
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.estado = est;
        b.dataset.clave = `${clave(d)}|${h}`;
        b.textContent = { completo: '—', ultima: 'última mesa', libre: 'libre' }[est];
        b.disabled = est === 'completo';
        const elegido = estado.dia && clave(estado.dia) === clave(d) && estado.hora === h;
        b.setAttribute('aria-pressed', String(Boolean(elegido)));
        b.setAttribute('aria-label', `${DIAS_LARGO[d.getDay()]} ${d.getDate()}, ${h}: ${b.textContent === '—' ? 'completo' : b.textContent}`);
        b.addEventListener('click', () => { estado.dia = d; estado.hora = h; pintarTodo(); });
        celda.append(b);
        return celda;
      }));
      return fila;
    }));
  }

  function pintarConfirmar() {
    const caja = $('[data-confirmar]', libro);
    caja.hidden = !estado.hora;
    if (!estado.hora) return;
    const d = estado.dia;
    const p = estado.personas === 1 ? 'una persona' : `${estado.personas} personas`;
    $('[data-resumen]', caja).innerHTML = `${DIAS_LARGO[d.getDay()]} ${d.getDate()}, <em>${estado.hora}</em>, ${p}.`;
  }

  function pintarTodo() { pintarPersonas(); pintarTabla(); pintarConfirmar(); }

  function cambiarPersonas(delta) {
    estado.personas = Math.min(6, Math.max(1, estado.personas + delta));
    if (estado.hora && mesasLibres(estado.dia, estado.hora) === 0) estado.hora = null;
    pintarTodo();
  }

  function confirmar() {
    const d = estado.dia;
    const k = `${clave(d)}|${estado.hora}`;
    tomadas.set(k, (tomadas.get(k) || 0) + 1);
    $('[data-listo-texto]', libro).textContent =
      `Mesa para ${estado.personas}, ${DIAS_LARGO[d.getDay()].toLowerCase()} ${d.getDate()} a las ${estado.hora}.`;
    $$('.libro-personas, .libro-tabla-caja, .libro-nota, [data-confirmar]', libro).forEach((el) => { el.hidden = true; });
    listo.hidden = false;
  }

  function otraReserva() {
    estado.hora = null;
    $$('.libro-personas, .libro-tabla-caja, .libro-nota', libro).forEach((el) => { el.hidden = false; });
    listo.hidden = true;
    pintarTodo();
  }

  /* Cada tanto alguien toma una mesa: el libro se mueve en vivo */
  function simularVivo() {
    const nota = $('[data-vivo]', libro);
    const pausa = () => 8000 + Math.random() * 7000;
    function tick() {
      const elegida = estado.dia ? `${clave(estado.dia)}|${estado.hora}` : '';
      const candidatas = $$('.libro-tabla td button:not(:disabled)', libro).filter((b) => b.dataset.clave !== elegida);
      if (listo.hidden && candidatas.length > 6) {
        const k = candidatas[Math.floor(Math.random() * candidatas.length)].dataset.clave;
        tomadas.set(k, (tomadas.get(k) || 0) + 1);
        pintarTabla();
        $(`.libro-tabla button[data-clave="${k}"]`, libro).classList.add('recien');
        nota.textContent = `Alguien acaba de reservar a las ${k.split('|')[1]}.`;
        setTimeout(() => { nota.textContent = 'La disponibilidad cambia mientras miras.'; }, 3500);
      }
      setTimeout(tick, pausa());
    }
    setTimeout(tick, pausa());
  }

  /* ---------- Arranque ---------- */
  rotularSemana();
  $('[data-menos]', libro).addEventListener('click', () => cambiarPersonas(-1));
  $('[data-mas]', libro).addEventListener('click', () => cambiarPersonas(1));
  $('[data-confirmar-boton]', libro).addEventListener('click', confirmar);
  $('[data-otra]', libro).addEventListener('click', otraReserva);
  pintarTodo();
  simularVivo();
})();

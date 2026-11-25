/* Prototipo P2 · Trabajos: las pantallas entran una vez y los recorridos
   corren solo mientras se ven. Con prefers-reduced-motion todo queda quieto y completo. */
(() => {
  'use strict';
  const bandas = Array.from(document.querySelectorAll('[data-banda]'));
  if (!bandas.length) return;

  const seMueve = document.documentElement.classList.contains('mov');
  const videos = Array.from(document.querySelectorAll('[data-recorrido]'));

  if (!seMueve) {
    /* Queda la imagen fija: se quita el archivo para que no se descargue. */
    videos.forEach((v) => { v.querySelectorAll('source').forEach((f) => f.remove()); v.load(); });
    return;
  }

  /* ---------- Recorridos ---------- */
  const detenidos = new WeakSet();
  const aLaVista = new WeakSet();
  const enPestanaActiva = (v) => { const p = v.closest('.visor__panel'); return !p || p.classList.contains('is-activo'); };
  const mover = (v) => {
    if (aLaVista.has(v) && enPestanaActiva(v) && !detenidos.has(v)) v.play().catch(() => { /* el navegador puede negarlo: queda el póster */ });
    else v.pause();
  };
  document.querySelectorAll('[data-pausa-recorrido]').forEach((boton) => {
    const video = boton.closest('.caso__visor, .caso__movil').querySelector('video');
    const panel = video.closest('.visor__panel');
    const nombre = boton.getAttribute('aria-label').replace('Pausar ', '');
    boton.hidden = false;
    if (panel) {
      /* El de escritorio comparte el visor con otras pantallas: fuera de su pestaña se frena y el botón no hace falta. */
      const alCambiarPestana = () => { boton.hidden = !enPestanaActiva(video); mover(video); };
      new MutationObserver(alCambiarPestana).observe(panel, { attributes: true, attributeFilter: ['class'] });
    }
    boton.addEventListener('click', () => {
      const pausado = boton.textContent === 'Pausar';
      boton.textContent = pausado ? 'Reanudar' : 'Pausar';
      boton.setAttribute('aria-label', `${boton.textContent} ${nombre}`);
      if (pausado) detenidos.add(video); else detenidos.delete(video);
      mover(video);
    });
  });

  if (!('IntersectionObserver' in window)) {
    bandas.forEach((b) => b.classList.add('is-llegada'));
    videos.forEach((v) => { aLaVista.add(v); mover(v); });
    return;
  }

  const mirarVideos = new IntersectionObserver((entradas) => entradas.forEach((en) => {
    if (en.isIntersecting) aLaVista.add(en.target); else aLaVista.delete(en.target);
    mover(en.target);
  }), { threshold: 0.25 });
  videos.forEach((v) => mirarVideos.observe(v));

  /* La entrada espera a que la primera pantalla esté lista, para que no se abra en blanco (como mucho, ESPERA_MAX). */
  const ESPERA_MAX = 1500;
  const portadaDe = (banda) => {
    const video = banda.querySelector('.caso__visor video');
    if (!video) return banda.querySelector('.visor__panel.is-activo img, .visor__panel img');
    const img = new Image();
    img.src = video.poster;
    return img;
  };
  const lista = (img) => {
    if (!img) return Promise.resolve();
    const tope = new Promise((ok) => { setTimeout(ok, ESPERA_MAX); });
    return Promise.race([img.decode().catch(() => { /* si no carga, entra igual */ }), tope]);
  };
  const precarga = new IntersectionObserver((entradas) => entradas.forEach((en) => {
    if (!en.isIntersecting) return;
    const img = portadaDe(en.target);
    if (img) img.loading = 'eager';
    precarga.unobserve(en.target);
  }), { rootMargin: '120% 0px' });
  bandas.forEach((b) => precarga.observe(b));

  const llegadas = new IntersectionObserver((entradas) => entradas.forEach((en) => {
    if (!en.isIntersecting) return;
    llegadas.unobserve(en.target);
    lista(portadaDe(en.target)).then(() => en.target.classList.add('is-llegada'));
  }), { threshold: 0.18 });
  bandas.forEach((b) => llegadas.observe(b));

  /* ---------- Paso por la pantalla, para el corrimiento leve del celular (solo las bandas cercanas) ---------- */
  const cerca = new Set();
  let pedido = 0;
  const acotar = (n) => Math.min(1, Math.max(0, n));

  const pintar = () => {
    pedido = 0;
    const alto = window.innerHeight;
    Array.from(cerca, (b) => [b, b.getBoundingClientRect()]).forEach(([b, r]) => {
      b.style.setProperty('--v', acotar((alto - r.top) / (alto + r.height)).toFixed(4));
    });
  };
  const pedir = () => { if (!pedido) pedido = requestAnimationFrame(pintar); };

  const vecinas = new IntersectionObserver((entradas) => {
    entradas.forEach((en) => { if (en.isIntersecting) cerca.add(en.target); else cerca.delete(en.target); });
    pedir();
  }, { rootMargin: '20% 0px' });
  bandas.forEach((b) => vecinas.observe(b));
  window.addEventListener('scroll', pedir, { passive: true });
  window.addEventListener('resize', pedir);
})();

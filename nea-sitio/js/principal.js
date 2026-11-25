/* Prototipo P2 · Ingeniería de producto.
   Sin librerías. Todo lo que se mueve es opcional: sin JS la página se lee entera,
   y con prefers-reduced-motion queda completa y quieta (la clase "mov" no se pone). */
(() => {
  'use strict';

  const raiz = document.documentElement;
  const seMueve = raiz.classList.contains('mov');
  const uno = (sel, ctx = document) => ctx.querySelector(sel);
  const todos = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const TEXTO_PAUSAR = 'Pausar';
  const TEXTO_REANUDAR = 'Reanudar';

  /* ---------- Pestañas (patrón de la guía ARIA: flechas, Inicio y Fin) ---------- */
  function iniciarPestanas(lista, alCambiar) {
    const pestanas = todos('[role="tab"]', lista);
    const paneles = pestanas.map((p) => document.getElementById(p.getAttribute('aria-controls')));
    const vertical = lista.getAttribute('aria-orientation') === 'vertical';
    let activa = Math.max(0, pestanas.findIndex((p) => p.getAttribute('aria-selected') === 'true'));

    const pintar = () => {
      pestanas.forEach((p, i) => {
        const es = i === activa;
        p.setAttribute('aria-selected', String(es));
        p.tabIndex = es ? 0 : -1;
        paneles[i].classList.toggle('is-activo', es);
      });
    };

    const elegir = (indice, conFoco = false) => {
      const nuevo = (indice + pestanas.length) % pestanas.length;
      if (nuevo !== activa) {
        lista.parentElement.dataset.sentido = nuevo > activa ? 'baja' : 'sube';
        activa = nuevo;
        pintar();
        if (alCambiar) alCambiar(activa, paneles[activa]);
      }
      if (conFoco) pestanas[activa].focus({ preventScroll: true });
    };

    const teclas = vertical
      ? { ArrowDown: 1, ArrowUp: -1 }
      : { ArrowRight: 1, ArrowLeft: -1 };

    pestanas.forEach((p, i) => {
      p.addEventListener('click', () => elegir(i));
      p.addEventListener('keydown', (e) => {
        if (e.key in teclas) { e.preventDefault(); elegir(activa + teclas[e.key], true); }
        else if (e.key === 'Home') { e.preventDefault(); elegir(0, true); }
        else if (e.key === 'End') { e.preventDefault(); elegir(pestanas.length - 1, true); }
      });
    });

    pintar();
    return {
      elegir,
      siguiente: () => elegir(activa + 1),
      panelActivo: () => paneles[activa],
      indice: () => activa,
      pestanas,
      paneles,
    };
  }

  /* ---------- Visores de pantallas ---------- */
  function iniciarVisor(visor) {
    const pestanas = iniciarPestanas(uno('[role="tablist"]', visor));
    const duracion = Number(visor.dataset.auto);
    if (!duracion || !seMueve) return;

    /* Avance automático. La línea de la pestaña activa es una animación CSS;
       cuando termina, pasa la pantalla. Pausar es frenar esa animación: no hay relojes que sincronizar. */
    const motivos = new Set();
    const actualizar = () => visor.classList.toggle('is-pausado', motivos.size > 0);
    const pausar = (motivo, si) => { if (si) motivos.add(motivo); else motivos.delete(motivo); actualizar(); };

    visor.style.setProperty('--auto', `${duracion}ms`);
    visor.classList.add('is-auto');
    visor.addEventListener('animationend', (e) => {
      if (e.animationName === 'avance') pestanas.siguiente();
    });

    visor.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') pausar('cursor', true); });
    visor.addEventListener('pointerleave', () => pausar('cursor', false));
    visor.addEventListener('focusin', () => pausar('foco', true));
    visor.addEventListener('focusout', () => pausar('foco', false));

    const boton = uno('[data-pausa]', visor);
    if (boton) {
      boton.hidden = false;
      boton.addEventListener('click', () => {
        const pausado = boton.getAttribute('aria-pressed') !== 'true';
        boton.setAttribute('aria-pressed', String(pausado));
        boton.textContent = pausado ? TEXTO_REANUDAR : TEXTO_PAUSAR;
        pausar('boton', pausado);
      });
    }

    if ('IntersectionObserver' in window) {
      pausar('fuera', true);
      new IntersectionObserver((entradas) => {
        entradas.forEach((en) => pausar('fuera', !en.isIntersecting));
      }, { threshold: 0.35 }).observe(visor);
    }
  }

  /* ---------- Qué hacemos: áreas y videos ---------- */
  function iniciarCapacidades(cap) {
    const lista = uno('[role="tablist"]', cap);
    const videos = todos('video', cap);
    const detenidos = new WeakSet();   // videos que la visita pausó con el botón
    let aLaVista = false;

    const mover = () => {
      const panel = pestanas.panelActivo();
      videos.forEach((v) => {
        const toca = seMueve && aLaVista && panel.contains(v) && !detenidos.has(v);
        if (toca) v.play().catch(() => { /* el navegador puede negar la reproducción: queda el póster */ });
        else v.pause();
      });
    };

    const pestanas = iniciarPestanas(lista, mover);

    if (!seMueve) {
      /* Con menos movimiento queda la imagen fija: se quita el archivo para que no se descargue. */
      videos.forEach((v) => { todos('source', v).forEach((f) => f.remove()); v.load(); });
      return pestanas;
    }

    todos('[data-pausa-video]', cap).forEach((boton) => {
      const video = uno('video', boton.closest('figure'));
      boton.hidden = false;
      boton.addEventListener('click', () => {
        const pausado = boton.getAttribute('aria-pressed') !== 'true';
        boton.setAttribute('aria-pressed', String(pausado));
        boton.textContent = pausado ? TEXTO_REANUDAR : TEXTO_PAUSAR;
        if (pausado) detenidos.add(video); else detenidos.delete(video);
        mover();
      });
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entradas) => {
        entradas.forEach((en) => { aLaVista = en.isIntersecting; });
        mover();
      }, { threshold: 0.2 }).observe(uno('.cap__paneles', cap));
    } else {
      aLaVista = true;
      mover();
    }
    return pestanas;
  }

  /* ---------- Qué hacemos: el scroll pasa de un área a la otra ---------- */
  const ALTO_MINIMO = '(min-height: 560px)';

  function iniciarScrollAreas(cap, areas) {
    const seccion = cap.closest('section');
    const forma = uno('.banda__forma', seccion);
    const fijo = uno('.caja', seccion);
    const alcanza = matchMedia(ALTO_MINIMO);
    const total = areas.pestanas.length;
    let pedido = 0;

    const estaFija = () => seccion.classList.contains('es-fija');
    /* Cuánto se avanzó dentro de la sección y cuánto hay para recorrer, en píxeles. */
    const medir = () => ({
      avance: parseFloat(getComputedStyle(fijo).top) - forma.getBoundingClientRect().top,
      recorrido: forma.offsetHeight - fijo.offsetHeight,
    });
    const seguir = () => {
      pedido = 0;
      if (!estaFija()) return;
      const { avance, recorrido } = medir();
      areas.elegir(Math.min(total - 1, Math.max(0, Math.floor((avance / recorrido) * total))));
    };
    const pedir = () => { if (!pedido) pedido = requestAnimationFrame(seguir); };

    /* Lleva la página al medio del tramo de esa área. Si la sección ya está fija, no se ve ningún salto. */
    const irA = (indice) => {
      if (!estaFija()) return false;
      const { avance, recorrido } = medir();
      const destino = window.scrollY - avance + recorrido * ((indice + 0.5) / total);
      const sinSalto = avance >= 0 && avance <= recorrido;
      window.scrollTo({ top: destino, behavior: sinSalto ? 'instant' : 'smooth' });
      return true;
    };

    const ajustar = () => { seccion.classList.toggle('es-fija', alcanza.matches); pedir(); };
    seccion.style.setProperty('--areas', total);
    alcanza.addEventListener('change', ajustar);
    window.addEventListener('scroll', pedir, { passive: true });
    window.addEventListener('resize', pedir);
    areas.pestanas.forEach((p, i) => {
      p.addEventListener('click', () => irA(i));
      p.addEventListener('keydown', (e) => {
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) irA(areas.indice());
      });
    });
    ajustar();
    return irA;
  }

  /* ---------- Menú ---------- */
  function iniciarMenu() {
    const boton = uno('#abrir-menu');
    const menu = uno('#menu');
    if (!boton || !menu) return () => {};

    const poner = (abierto) => {
      menu.hidden = !abierto;
      boton.setAttribute('aria-expanded', String(abierto));
      boton.textContent = abierto ? 'Cerrar' : 'Menú';
      raiz.style.overflow = abierto ? 'hidden' : '';
    };
    boton.addEventListener('click', () => poner(menu.hidden));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) poner(false); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !menu.hidden) { poner(false); boton.focus(); }
    });
    matchMedia('(min-width: 1100px)').addEventListener('change', (e) => { if (e.matches) poner(false); });
    return poner;
  }

  /* ---------- Aparecer al llegar ---------- */
  function iniciarLlegadas() {
    const piezas = todos('.rev');
    const simbolo = uno('#simbolo');
    if (!seMueve) return;
    if (!('IntersectionObserver' in window)) {
      piezas.forEach((p) => p.classList.add('is-vista'));
      if (simbolo) simbolo.classList.add('is-armado');
      return;
    }
    const mirador = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-vista');
        mirador.unobserve(en.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    piezas.forEach((p) => mirador.observe(p));

    if (simbolo) {
      const armador = new IntersectionObserver((entradas) => {
        entradas.forEach((en) => {
          if (!en.isIntersecting) return;
          simbolo.classList.add('is-armado');
          armador.disconnect();
        });
      }, { threshold: 0.6 });
      armador.observe(simbolo);
    }
  }

  /* ---------- Formulario ----------
     No hay servidor: "Enviar" arma el mensaje y abre el correo de la visita. */
  const CORREO = 'hola@neasistemas.com.ar';
  const REQUERIDOS = [
    { nombre: 'proyecto', rotulo: 'el proyecto' },
    { nombre: 'nombre', rotulo: 'el nombre' },
    { nombre: 'mail', rotulo: 'el mail' },
  ];

  function iniciarFormulario() {
    const form = uno('#formulario');
    const estado = uno('#form-estado');
    if (!form || !estado) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const datos = new FormData(form);
      const faltan = REQUERIDOS.filter(({ nombre }) => {
        const campo = form.elements[nombre];
        const mal = !String(datos.get(nombre) || '').trim() || !campo.checkValidity();
        campo.setAttribute('aria-invalid', String(mal));
        return mal;
      });
      if (faltan.length) {
        estado.textContent = `Falta completar: ${faltan.map((f) => f.rotulo).join(', ')}.`;
        form.elements[faltan[0].nombre].focus();
        return;
      }

      const linea = (rotulo, valor) => (valor ? `${rotulo}: ${valor}` : null);
      const cuerpo = [
        linea('Qué necesito', datos.getAll('areas').join(', ')),
        linea('Proyecto', String(datos.get('proyecto')).trim()),
        linea('Para cuándo', datos.get('plazo')),
        linea('Presupuesto aproximado', datos.get('presupuesto')),
        linea('Nombre', String(datos.get('nombre')).trim()),
        linea('Empresa', String(datos.get('empresa') || '').trim()),
        linea('Mail', String(datos.get('mail')).trim()),
        linea('WhatsApp', String(datos.get('whatsapp') || '').trim()),
      ].filter(Boolean).join('\n');

      estado.textContent = 'Se abre tu correo con el mensaje cargado.';
      window.location.href = `mailto:${CORREO}?subject=${encodeURIComponent('Proyecto')}&body=${encodeURIComponent(cuerpo)}`;
    });

    form.addEventListener('input', (e) => {
      if (e.target.getAttribute('aria-invalid') === 'true') e.target.setAttribute('aria-invalid', 'false');
    });
  }

  /* ---------- Arranque ---------- */
  todos('[data-visor]').forEach(iniciarVisor);

  const cap = uno('[data-cap]');
  const areas = cap ? iniciarCapacidades(cap) : null;
  const irAlArea = areas && seMueve ? iniciarScrollAreas(cap, areas) : () => false;
  iniciarMenu();

  /* El menú nombra las cuatro áreas: sus páginas todavía no existen, así que abren el área en "Qué hacemos". */
  if (areas) {
    todos('a[data-area]').forEach((enlace) => {
      enlace.addEventListener('click', (e) => {
        const indice = areas.pestanas.findIndex((p) => p.dataset.area === enlace.dataset.area);
        if (indice < 0) return;
        if (irAlArea(indice)) { e.preventDefault(); areas.pestanas[indice].focus({ preventScroll: true }); }
        else areas.elegir(indice);
      });
    });
  }

  iniciarLlegadas();
  iniciarFormulario();
})();

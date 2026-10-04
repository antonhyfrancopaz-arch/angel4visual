// Fase 3 — Animaciones guiadas por scroll. JS propio, sin librerías.
(function () {
  'use strict';

  var mqlReducida = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mqlEscritorio = window.matchMedia('(min-width: 1100px)');

  function reducida() { return mqlReducida.matches; }
  function esEscritorio() { return mqlEscritorio.matches; }

  document.documentElement.classList.add('js-animaciones');

  // ---------- Portada: fundido de entrada (una vez, al cargar) ----------
  var portadaTitulo = document.querySelector('[data-animar="titulo"]');
  var portadaMujer = document.querySelector('[data-animar="mujer"]');
  if (portadaTitulo) portadaTitulo.classList.add('animar--visible');
  if (portadaMujer) portadaMujer.classList.add('animar--visible');

  // ---------- Parallax leve de la foto de portada ----------
  if (portadaMujer && !reducida()) {
    var tickingParallax = false;
    var actualizarParallax = function () {
      var scrollY = window.scrollY || window.pageYOffset || 0;
      var desplazamiento = Math.max(-20, Math.min(20, scrollY * -0.05));
      portadaMujer.style.setProperty('--parallax', desplazamiento.toFixed(1) + 'px');
      tickingParallax = false;
    };
    window.addEventListener('scroll', function () {
      if (!tickingParallax) {
        window.requestAnimationFrame(actualizarParallax);
        tickingParallax = true;
      }
    }, { passive: true });
    actualizarParallax();
  }

  // ---------- Cámara: quitar `hidden` nativo de los 3 pasos ----------
  var seccionCamara = document.getElementById('que-hago');
  var pasos = seccionCamara
    ? seccionCamara.querySelectorAll('.camara__paso')
    : [];
  pasos.forEach(function (el) { el.hidden = false; });

  var camaraCrossfadeActiva = esEscritorio() && !reducida();
  var textoCamara = seccionCamara
    ? seccionCamara.querySelector('[data-camara-textos]')
    : null;
  if (camaraCrossfadeActiva && textoCamara) {
    textoCamara.classList.add('js-camara-activo');
    if (pasos[0]) pasos[0].classList.add('es-visible');
  }

  // ---------- Cámara: reaccionar a cambios de ancho/reduced-motion sin recargar ----------
  var actualizarModoCamara = function () {
    var activo = esEscritorio() && !reducida();
    if (activo === camaraCrossfadeActiva) return;
    camaraCrossfadeActiva = activo;
    if (textoCamara) textoCamara.classList.toggle('js-camara-activo', activo);
    if (activo) {
      pasos.forEach(function (el, i) { el.classList.toggle('es-visible', i === 0); });
    } else {
      pasos.forEach(function (el) {
        el.classList.remove('es-visible');
        el.classList.add('animar--visible');
      });
    }
  };
  mqlEscritorio.addEventListener('change', actualizarModoCamara);
  mqlReducida.addEventListener('change', actualizarModoCamara);

  // ---------- Aparición escalonada genérica (data-animar, salvo cámara/portada) ----------
  var elementosAnimar = document.querySelectorAll(
    '[data-animar]:not([data-animar="camara"]):not([data-animar="titulo"]):not([data-animar="mujer"])'
  );
  var pasosSimples = camaraCrossfadeActiva ? [] : pasos;

  if ('IntersectionObserver' in window) {
    var observadorReveal = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('animar--visible');
          observadorReveal.unobserve(entrada.target);
        }
      });
    }, { threshold: 0.15 });

    elementosAnimar.forEach(function (el) { observadorReveal.observe(el); });
    pasosSimples.forEach(function (el) { observadorReveal.observe(el); });
  } else {
    elementosAnimar.forEach(function (el) { el.classList.add('animar--visible'); });
    pasosSimples.forEach(function (el) { el.classList.add('animar--visible'); });
  }

  // ---------- Tarjetas: liberar transition-delay del stagger tras la primera aparición ----------
  document.querySelectorAll('#proyectos .tarjeta').forEach(function (tarjeta) {
    tarjeta.addEventListener('transitionend', function marcar(e) {
      if (e.target !== tarjeta) return;
      if (e.propertyName !== 'opacity') return;
      tarjeta.classList.add('reveal-listo');
      tarjeta.removeEventListener('transitionend', marcar);
    });
  });

  // ---------- Cámara: scrubbing de fotogramas + cruce de textos en escritorio ----------
  var imgCamara = seccionCamara
    ? seccionCamara.querySelector('[data-camara-imagen]')
    : null;
  var camaraPin = seccionCamara
    ? seccionCamara.querySelector('.camara__pin')
    : null;
  var camaraMarco = seccionCamara
    ? seccionCamara.querySelector('.camara__marco')
    : null;

  if (seccionCamara && imgCamara && !reducida()) {
    var totalFrames = parseInt(seccionCamara.dataset.totalFrames, 10) || 80;
    var plantillaMovil = seccionCamara.dataset.framesMovil;
    var plantillaEscritorio = seccionCamara.dataset.framesEscritorio;

    var plantillaActiva = function () {
      return esEscritorio() ? plantillaEscritorio : plantillaMovil;
    };
    var rutaFrame = function (n) {
      var numero = String(n).padStart(2, '0');
      return plantillaActiva().replace('{n}', numero);
    };

    // Precarga en paralelo (6 a la vez), solo la plantilla activa; las Image se guardan para que no se descarten.
    var framesCache = [];
    var plantillaPrecargada = null;
    var precargarFrames = function () {
      var plantilla = plantillaActiva();
      if (plantilla === plantillaPrecargada) return;
      plantillaPrecargada = plantilla;
      framesCache = [];
      var siguiente = 1;
      var lanzar = function () {
        if (plantilla !== plantillaPrecargada || siguiente > totalFrames) return;
        var n = siguiente++;
        var img = new Image();
        framesCache[n] = img;
        img.src = plantilla.replace('{n}', String(n).padStart(2, '0'));
        img.decode().catch(function () {}).then(lanzar);
      };
      for (var k = 0; k < 6; k++) lanzar();
    };
    precargarFrames();
    mqlEscritorio.addEventListener('change', precargarFrames);

    var frameActual = -1;
    var aplicarFrame = function (progreso) {
      var n = Math.round(progreso * (totalFrames - 1)) + 1;
      if (n !== frameActual) {
        frameActual = n;
        imgCamara.src = rutaFrame(n);
      }
    };

    var aplicarPasoEscritorio = function (progreso) {
      var activo = progreso < 1 / 3 ? 1 : progreso < 2 / 3 ? 2 : 3;
      pasos.forEach(function (el) {
        var esActivo = Number(el.dataset.paso) === activo;
        el.classList.toggle('es-visible', esActivo);
      });
    };

    var progresoCamara = function () {
      if (esEscritorio()) {
        var rect = seccionCamara.getBoundingClientRect();
        var alto = seccionCamara.offsetHeight - window.innerHeight;
        if (alto <= 0) return 1;
        var avanzado = -rect.top;
        return Math.max(0, Math.min(1, avanzado / alto));
      }
      if (!camaraPin || !camaraMarco) return 0;
      var topPin = camaraPin.getBoundingClientRect().top;
      var stickyTop = parseFloat(getComputedStyle(camaraMarco).top) || 0;
      var recorrido = camaraPin.offsetHeight - camaraMarco.offsetHeight;
      if (recorrido <= 0) return 1;
      return Math.max(0, Math.min(1, (stickyTop - topPin) / recorrido));
    };

    var tickingCamara = false;
    var actualizarCamara = function () {
      var progreso = progresoCamara();
      aplicarFrame(progreso);
      if (camaraCrossfadeActiva) aplicarPasoEscritorio(progreso);
      tickingCamara = false;
    };
    window.addEventListener('scroll', function () {
      if (!tickingCamara) {
        window.requestAnimationFrame(actualizarCamara);
        tickingCamara = true;
      }
    }, { passive: true });
    actualizarCamara();
  }

  // ---------- Videos por visibilidad (data-video) ----------
  if (!reducida()) {
    document.querySelectorAll('[data-video]').forEach(function (contenedor) {
      var ruta = contenedor.dataset.video;
      if (!ruta) return; // data-video="" (sección .corte): se omite

      var modo = contenedor.dataset.modo || 'bucle';
      var posterImg = contenedor.querySelector('img');
      var destino = contenedor.querySelector('.tarjeta__mini') || contenedor;

      var video = document.createElement('video');
      video.muted = true;
      video.setAttribute('muted', '');
      video.playsInline = true;
      video.preload = 'none';
      if (posterImg) video.poster = posterImg.src;
      if (modo === 'bucle') video.loop = true;
      video.src = ruta;
      destino.appendChild(video);

      if ('IntersectionObserver' in window) {
        var obsVideo = new IntersectionObserver(function (entradas) {
          entradas.forEach(function (entrada) {
            if (entrada.isIntersecting) {
              video.play().catch(function () {});
            } else {
              video.pause();
            }
          });
        }, { threshold: 0.45 });
        obsVideo.observe(contenedor);
      }
    });
  }
})();

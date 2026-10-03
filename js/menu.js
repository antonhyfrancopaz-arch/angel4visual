/* Menú móvil (el sello abre el panel) + sección activa en la barra.
   Sin animaciones ni dependencias. Las animaciones llegan en la fase 3. */
(function () {
  'use strict';

  var boton = document.querySelector('[data-menu-boton]');
  var panel = document.querySelector('[data-menu-panel]');
  var cerrar = document.querySelector('[data-menu-cerrar]');
  if (!boton || !panel) return;

  function abrir() {
    panel.hidden = false;
    boton.setAttribute('aria-expanded', 'true');
    boton.setAttribute('aria-label', 'Cerrar menú');
    var primero = panel.querySelector('a');
    if (primero) primero.focus();
  }
  function cerrarMenu(devolverFoco) {
    if (panel.hidden) return;
    panel.hidden = true;
    boton.setAttribute('aria-expanded', 'false');
    boton.setAttribute('aria-label', 'Abrir menú');
    if (devolverFoco) boton.focus();
  }

  boton.addEventListener('click', function () { panel.hidden ? abrir() : cerrarMenu(true); });
  if (cerrar) cerrar.addEventListener('click', function () { cerrarMenu(true); });
  panel.addEventListener('click', function (e) { if (e.target.closest('a')) cerrarMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarMenu(true); });
  window.matchMedia('(min-width: 1100px)').addEventListener('change', function (e) { if (e.matches) cerrarMenu(false); });

  /* Sección activa: la última cuyo borde superior ya pasó la barra. */
  var ids = ['inicio', 'que-hago', 'proyectos', 'asi-trabajamos', 'datos', 'contacto', 'extras'];
  var secciones = ids.map(function (id) { return document.getElementById(id); });
  var enlaces = document.querySelectorAll('.enlaces-escritorio a, .menu-movil a');
  var activa = null;
  var pendiente = false;

  function marcar() {
    pendiente = false;
    var actual = ids[0];
    for (var i = 0; i < secciones.length; i++) {
      if (secciones[i] && secciones[i].getBoundingClientRect().top <= 120) actual = ids[i];
    }
    if (actual === activa) return;
    activa = actual;
    enlaces.forEach(function (a) {
      if (a.getAttribute('href') === '#' + actual) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }
  window.addEventListener('scroll', function () {
    if (!pendiente) { pendiente = true; window.requestAnimationFrame(marcar); }
  }, { passive: true });
  marcar();
})();

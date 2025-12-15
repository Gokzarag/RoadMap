// Carga el encabezado + popup en todas las páginas
async function loadSidebar(activePage){
  const container = document.getElementById('sidebar-container');
  if (!container) return;

  try{
    const resp = await fetch('sidebar.html');
    const html = await resp.text();
    container.innerHTML = html;

    // aplicar zona guardada
    if (typeof pintarZona === 'function'){
      pintarZona();
    }

    // inicializar popup
    initPopupMenu();

    // podrías resaltar módulo activo más adelante si lo deseas
    // buscando el <a> correspondiente por href
  }catch(e){
    console.error('Error cargando sidebar:', e);
  }
}

// Manejo del popup de módulos
function initPopupMenu(){
  const btn   = document.getElementById('btn-menu');
  const popup = document.getElementById('menu-popup');
  const close = document.getElementById('menu-close');

  if (!btn || !popup || !close) return;

  const toggle = () => popup.classList.toggle('open');

  btn.addEventListener('click', toggle);
  close.addEventListener('click', toggle);

  // cerrar al hacer clic fuera del panel
  popup.addEventListener('click', e => {
    if (e.target === popup){
      popup.classList.remove('open');
    }
  });
}

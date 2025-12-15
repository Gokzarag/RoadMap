async function loadSidebar(activePage){
  const container = document.getElementById('sidebar-container');
  if (!container) return;

  try{
    const resp = await fetch('sidebar.html');
    const html = await resp.text();
    container.innerHTML = html;

    // marcar enlace activo
    const link = container.querySelector(`[data-page="${activePage}"]`);
    if (link){
      link.classList.add('primary');
    }

    // aplicar zona guardada
    if (typeof pintarZona === 'function'){
      pintarZona();
    }

    // botón hamburguesa
    initHamburger();
  }catch(e){
    console.error('Error cargando sidebar:', e);
  }
}

function initHamburger(){
  const btn    = document.getElementById('btn-menu');
  const layout = document.querySelector('.layout');
  if (!btn || !layout) return;

  btn.addEventListener('click', () => {
    layout.classList.toggle('menu-collapsed');
  });
}
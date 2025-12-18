// Carga el encabezado + popup en todas las páginas
async function loadSidebar(activePage){
  const container = document.getElementById('sidebar-container');
  if (!container) return;

  try{
    const resp = await fetch('sidebar.html');
    const html = await resp.text();
    container.innerHTML = html;

    // conectar select de zona y popup
    wireZonaSelect();
    initPopupMenu();

    // pintar zona en la página actual, si existe
    if (typeof pintarZona === 'function') {
      pintarZona();
    }
  }catch(e){
    console.error('Error cargando sidebar:', e);
  }
}

// Conecta el change del select al cambio de zona
function wireZonaSelect(){
  const sel = document.getElementById('select-zona');
  if (!sel) return;

  // valor inicial desde getZona/localStorage
  let current = null;
  if (typeof getZona === 'function') {
    current = getZona();
  } else {
    current = localStorage.getItem('maptrack_zona') || '0752';
  }
  sel.value = current;

  sel.addEventListener('change', (e) => {
    const z = e.target.value;
    if (typeof onZonaChange === 'function') {
      onZonaChange(z);
    } else if (typeof setZona === 'function') {
      setZona(z);
    } else {
      localStorage.setItem('maptrack_zona', z);
    }
  });
}

// Manejo del popup de módulos
function initPopupMenu(){
  const btn = document.getElementById('btn-menu');
  const popup = document.getElementById('menu-popup');
  const close = document.getElementById('menu-close');
  if (!btn || !popup || !close) return;

  const toggle = () => popup.classList.toggle('open');
  btn.addEventListener('click', toggle);
  close.addEventListener('click', toggle);

  popup.addEventListener('click', e => {
    if (e.target === popup){
      popup.classList.remove('open');
    }
  });
}

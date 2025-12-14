async function loadKPI(){
  const zona = getZona();

  const subtitle    = document.getElementById('kpi-subtitle');
  const cards       = document.getElementById('kpi-cards');
  const tbodyCanal  = document.querySelector('#table-canal tbody');
  const tbodyPlaca  = document.querySelector('#table-placa tbody');
  const fechaLabel  = document.getElementById('kpi-fecha');

  if (!subtitle || !cards || !tbodyCanal || !tbodyPlaca) return;

  subtitle.textContent = 'Cargando datos de la zona seleccionada...';
  if (fechaLabel) fechaLabel.textContent = '';
  cards.innerHTML      = '';
  tbodyCanal.innerHTML = '';
  tbodyPlaca.innerHTML = '';

  try{
    // === 1. Leer MapTrack ===
    const respMap = await fetch('https://raw.githubusercontent.com/Gokzarag/RoadMap/main/MapTrack_V2.1.csv');
    const textMap = await respMap.text();
    const linesMap = textMap.split('\n').filter(l => l.trim().length > 0);
    if (linesMap.length <= 1){
      subtitle.textContent = 'No se encontraron registros en el archivo de planificación.';
      return;
    }
    const rowsMap = linesMap.slice(1).map(l => l.split(','));

    // Columnas de MapTrack (0‑based)
    const COL_FECHA   = 0;   // fecha entrega
    const COL_ZONA    = 1;   // zona
    const COL_VEH     = 2;   // placa
    const COL_CLIENTE = 3;   // código Sigma
    const COL_KG      = 10;  // kg
    const COL_LAT     = 16;  // latitud
    const COL_LNG     = 17;  // longitud

    // Filtrar por zona activa
    let dataRaw = rowsMap.filter(r =>
      r.length > COL_KG &&
      (r[COL_ZONA] || '').trim() === zona
    );

    // Fecha de entrega (primer registro de la zona)
    let fechaEntrega = '-';
    if (dataRaw.length > 0){
      fechaEntrega = (dataRaw[0][COL_FECHA] || '').trim();
    }

    // === 2. Catálogo Sigma: canal por cliente ===
    const respCat = await fetch('https://raw.githubusercontent.com/Gokzarag/RoadMap/main/Catalogo%20Sigma.csv');
    const textCat = await respCat.text();
    const linesCat = textCat.split('\n').filter(l => l.trim().length > 0);
    const rowsCat  = linesCat.slice(1).map(l => l.split(','));

    // col 0: código, col 21: canal
    const canalPorCliente = new Map();
    rowsCat.forEach(r=>{
      const cod   = (r[0]  || '').trim();
      const canal = (r[21] || '').trim();
      if (cod) canalPorCliente.set(cod, canal || 'SIN CANAL');
    });

    // === 3. Mapear datos con canal + lat/lng ===
    let data = dataRaw.map(r => {
      const veh   = (r[COL_VEH] || '').trim();
      const cli   = (r[COL_CLIENTE] || '').trim();
      const raw   = (r[COL_KG] || '').toString().trim().replace(',', '.');
      const kg    = parseFloat(raw) || 0;
      const canal = canalPorCliente.get(cli) || 'SIN CANAL';

      const latRaw = (r[COL_LAT] || '').toString().trim().replace(',', '.');
      const lngRaw = (r[COL_LNG] || '').toString().trim().replace(',', '.');
      const latVal = parseFloat(latRaw);
      const lngVal = parseFloat(lngRaw);
      const lat    = isNaN(latVal) ? null : latVal;
      const lng    = isNaN(lngVal) ? null : lngVal;

      return {veh, cli, kg, canal, lat, lng};
    });

    // Excluir RES-CLI y FRT-001 de todos los cálculos de Kg (incluye heatmap)
    const dataKg   = data.filter(d => d.veh !== 'FRT-001' && d.veh !== 'RES-CLI');

    // Para unidades, excluir BHP-765 y RES-CLI (como antes)
    const dataUnid = data.filter(d => d.veh !== 'BHP-765' && d.veh !== 'RES-CLI');

    // === 4. Heatmap ===
    const heatPoints = dataKg
      .filter(d => d.lat !== null && d.lng !== null)
      .map(d => [d.lat, d.lng, d.kg]);

    if (typeof renderHeatmap === 'function'){
      renderHeatmap(heatPoints);
    }

    // === 5. KPIs principales ===
    const kgPlan      = dataKg.reduce((s,d)=>s + d.kg, 0);
    const clientesSet = new Set(dataKg.map(d=>d.cli).filter(x=>x));
    const vehSet      = new Set(dataUnid.map(d=>d.veh).filter(x=>x));

    const nClientes = clientesSet.size;
    const nUnidades = vehSet.size;

    const kgVeh  = nUnidades ? kgPlan / nUnidades : 0;
    const cliVeh = nUnidades ? nClientes / nUnidades : 0;
    const kgCli  = nClientes ? kgPlan / nClientes : 0;

    function fmtKg(x){  return x.toLocaleString('es-PE',{maximumFractionDigits:0}); }
    function fmtNum(x){ return x.toLocaleString('es-PE',{maximumFractionDigits:0}); }
    function fmtDec(x){ return x.toLocaleString('es-PE',{maximumFractionDigits:1}); }

    const htmlCards = [
      {titulo:'Kg Planificados',   valor:fmtKg(kgPlan)},
      {titulo:'N° Clientes',       valor:fmtNum(nClientes)},
      {titulo:'N° Unidades',       valor:fmtNum(nUnidades)},
      {titulo:'Kg/Vehículo',       valor:fmtKg(kgVeh)},
      {titulo:'Clientes/Vehículo', valor:fmtDec(cliVeh)},
      {titulo:'Kg/Cliente',        valor:fmtKg(kgCli)}
    ].map(k => `
      <div class="mod-card">
        <h2>${k.titulo}</h2>
        <p style="font-size:22px;font-weight:700;margin-top:2px;">${k.valor}</p>
      </div>
    `).join('');
    cards.innerHTML = htmlCards;

    // Fecha en encabezado
    subtitle.textContent = 'Resumen calculado para la zona activa.';
    if (fechaLabel){
      fechaLabel.textContent = fechaEntrega && fechaEntrega !== '-' 
        ? ('Fecha de entrega: ' + fechaEntrega)
        : '';
    }

    // === 6. Resumen por CANAL (solo dataKg) ===
    const mapCanal = new Map();
    dataKg.forEach(d=>{
      const key = d.canal || 'SIN CANAL';
      if (!mapCanal.has(key)){
        mapCanal.set(key,{kg:0, clientes:new Set()});
      }
      const obj = mapCanal.get(key);
      obj.kg += d.kg;
      if (d.cli) obj.clientes.add(d.cli);
    });

    tbodyCanal.innerHTML = '';
    Array.from(mapCanal.entries())
      .sort((a,b)=>b[1].kg - a[1].kg)
      .forEach(([canal,info])=>{
        const kg     = info.kg;
        const nCli   = info.clientes.size || 0;
        const kgXCli = nCli ? kg / nCli : 0;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${canal}</td>
          <td>${fmtKg(kg)}</td>
          <td>${fmtNum(nCli)}</td>
          <td>${fmtDec(kgXCli)}</td>
        `;
        tbodyCanal.appendChild(tr);
      });

    // === 7. Resumen por PLACA con % FSE (solo dataKg, orden alfabético) ===
    const mapPlaca = new Map();
    dataKg.forEach(d=>{
      const key = d.veh || 'SIN PLACA';
      if (!mapPlaca.has(key)){
        mapPlaca.set(key,{
          kgTotal:0,
          kgFSE:0,
          clientesTotal:new Set(),
          clientesFSE:new Set()
        });
      }
      const obj = mapPlaca.get(key);
      obj.kgTotal += d.kg;
      obj.clientesTotal.add(d.cli);

      if (d.canal === 'FSE'){
        obj.kgFSE += d.kg;
        obj.clientesFSE.add(d.cli);
      }
    });

    tbodyPlaca.innerHTML = '';
    Array.from(mapPlaca.entries())
      .sort((a,b)=> a[0].localeCompare(b[0])) // orden alfabético por placa
      .forEach(([placa,info])=>{
        const nCliTotal = info.clientesTotal.size || 0;
        const nCliFSE   = info.clientesFSE.size || 0;
        const pctCliFSE = nCliTotal ? (nCliFSE / nCliTotal) * 100 : 0;

        const kgTotal   = info.kgTotal;
        const kgFSE     = info.kgFSE;
        const pctKgFSE  = kgTotal ? (kgFSE / kgTotal) * 100 : 0;

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${placa}</td>
          <td>${fmtNum(nCliTotal)}</td>
          <td>${fmtDec(pctCliFSE)}%</td>
          <td>${fmtKg(kgTotal)}</td>
          <td>${fmtDec(pctKgFSE)}%</td>
        `;
        tbodyPlaca.appendChild(tr);
      });

  }catch(e){
    console.error(e);
    subtitle.textContent = 'Error al cargar los datos.';
    if (fechaLabel) fechaLabel.textContent = '';
  }
}

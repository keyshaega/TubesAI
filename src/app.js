// Kontrol permainan, gambar grid, dan tabel. Algoritme ada di pathfinding.js.
(function () {
  'use strict';
  const byId = id => document.getElementById(id);
  const canvas = byId('world');
  const ctx = canvas.getContext('2d');
  const mapSelect = byId('map-select');
  const heuristicSelect = byId('heuristic-select');
  let map, npc, player, result, timer = null, experiment = null;
  const labelOf = id => PathLab.HEURISTICS.find(h => h.id === id)?.label || id;
  const number = value => Number.isFinite(value) ? value.toFixed(2) : '—';

  for (const item of LabMaps.list()) mapSelect.add(new Option(item.name, item.id));
  for (const item of PathLab.HEURISTICS) heuristicSelect.add(new Option(item.label, item.id));
  heuristicSelect.value = 'manhattan';

  function pause() {
    clearInterval(timer);
    timer = null;
    byId('play').textContent = '▶ Mulai mengejar';
  }

  function reset() {
    pause();
    map = LabMaps.create(mapSelect.value);
    npc = { ...map.start };
    player = { ...map.goal };
    byId('map-title').textContent = map.name;
    byId('map-description').textContent = map.description;
    replan();
  }

  function replan() {
    result = PathLab.search(map.grid, npc, player, heuristicSelect.value);
    byId('formula').textContent = 'h(n) = ' + PathLab.HEURISTICS.find(h => h.id === heuristicSelect.value).formula;
    byId('expanded-count').textContent = result.expandedCount;
    byId('path-cost').textContent = result.found ? result.cost : '—';
    byId('frontier-count').textContent = result.frontier.length;
    byId('search-time').textContent = number(result.timeMs);
    const caught = npc.x === player.x && npc.y === player.y;
    if (!result.found || caught) pause();
    byId('status').textContent = caught ? 'Player tertangkap! Gerakkan player untuk bermain lagi.' :
      !result.found ? 'Tidak ada jalur ke player. Coba pindahkan player atau ganti peta.' :
      timer ? 'NPC sedang mengejar. Gerakkan player untuk menghindar.' : 'Jalur siap. Mulai mengejar atau coba satu langkah.';
    byId('step').disabled = !result.found || caught;
    byId('play').disabled = !result.found || caught;
    byId('trace').replaceChildren();
    result.expanded.slice(0, 8).forEach((node, index) => {
      addRow(byId('trace'), [index + 1, `(${node.x}, ${node.y})`, node.g, number(node.h), number(node.f)]);
    });
    draw();
  }

  function step() {
    if (!result.found || result.path.length < 2) return;
    npc = { ...result.path[1] };
    replan(); // Overlay selalu cocok dengan posisi NPC yang sekarang.
  }

  function movePlayer(dx, dy) {
    const next = { x: player.x + dx, y: player.y + dy };
    if (PathLab.isWalkable(map.grid, next)) {
      player = next;
      replan();
    }
  }

  // Setiap sel digambar sederhana agar hubungan gambar dan grid mudah dilihat.
  function draw() {
    const size = canvas.width / map.grid[0].length;
    const colors = ['#e0e7c8', '#8d9684', '#d4ad83', '#6e9461', '#9fc9d5', '#c29d6d'];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    map.grid.forEach((row, y) => row.forEach((tile, x) => {
      const px = x * size, py = y * size;
      ctx.fillStyle = colors[tile];
      ctx.fillRect(px, py, size, size);
      ctx.strokeStyle = 'rgba(48,70,46,.10)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + .5, py + .5, size, size);
      if (tile === 1) {
        ctx.fillStyle = '#a0aa95';
        ctx.fillRect(px + 3, py + 3, size - 6, size - 10);
        ctx.strokeStyle = '#7b8673';
        ctx.beginPath(); ctx.moveTo(px, py + size / 2); ctx.lineTo(px + size, py + size / 2); ctx.stroke();
      } else if (tile === 2) {
        ctx.fillStyle = '#ecd7b2'; ctx.fillRect(px + 9, py + 18, size - 18, size - 21);
        ctx.fillStyle = '#ac7058'; ctx.beginPath();
        ctx.moveTo(px + 4, py + 20); ctx.lineTo(px + size / 2, py + 5); ctx.lineTo(px + size - 4, py + 20); ctx.fill();
        ctx.fillStyle = '#886b53'; ctx.fillRect(px + 17, py + 26, 7, 11);
      } else if (tile === 3) {
        ctx.fillStyle = '#796b45'; ctx.fillRect(px + 17, py + 24, 6, 12);
        circle(px + 20, py + 18, 14, '#467446');
        circle(px + 16, py + 14, 9, '#5d8953');
      } else if (tile === 4) {
        ctx.strokeStyle = '#cbe2e5'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(px + 7, py + 15); ctx.lineTo(px + 20, py + 15);
        ctx.moveTo(px + 20, py + 27); ctx.lineTo(px + 34, py + 27); ctx.stroke();
      } else if (tile === 5) {
        ctx.strokeStyle = '#957449'; ctx.lineWidth = 2;
        for (let offset = 7; offset < size; offset += 9) {
          ctx.beginPath(); ctx.moveTo(px + offset, py + 3); ctx.lineTo(px + offset, py + size - 3); ctx.stroke();
        }
      }
    }));
    if (byId('overlay').checked) {
      for (const node of result.expanded) {
        ctx.fillStyle = 'rgba(215,165,46,.36)';
        ctx.fillRect(node.x * size + 2, node.y * size + 2, size - 4, size - 4);
      }
      for (const node of result.frontier) {
        ctx.fillStyle = 'rgba(71,132,174,.36)';
        ctx.fillRect(node.x * size + 2, node.y * size + 2, size - 4, size - 4);
      }
      if (result.path.length) {
        ctx.strokeStyle = '#bd642d'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
        ctx.beginPath();
        result.path.forEach((node, index) => {
          const x = (node.x + .5) * size, y = (node.y + .5) * size;
          if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    }
    character(npc, '#ce7137', 'N', size);
    character(player, '#27654f', 'P', size);
  }

  function circle(x, y, radius, color) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  }

  function character(position, color, letter, size) {
    const x = (position.x + .5) * size, y = (position.y + .5) * size;
    circle(x, y + 3, 16, 'rgba(41,58,32,.20)');
    circle(x, y, 16, '#fffaf0');
    circle(x, y, 13, color);
    ctx.fillStyle = 'white'; ctx.font = 'bold 15px system-ui';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(letter, x, y + 1);
  }

  function addRow(body, values) {
    const row = document.createElement('tr');
    for (const value of values) {
      const cell = document.createElement('td'); cell.textContent = value; row.appendChild(cell);
    }
    body.appendChild(row);
  }

  function runExperiments() {
    pause(); replan();
    experiment = Experiments.runSuite();
    byId('experiment-summary').replaceChildren();
    byId('experiment-details').replaceChildren();
    for (const row of experiment.summary) {
      addRow(byId('experiment-summary'), [labelOf(row.heuristic), `${row.found} / ${row.runs}`,
        number(row.avgExpanded), number(row.avgTimeMs), number(row.avgRatio)]);
    }
    for (const row of experiment.rows) {
      const mapName = LabMaps.list().find(item => item.id === row.scenario)?.name || row.scenario;
      addRow(byId('experiment-details'), [mapName, labelOf(row.heuristic), row.expandedCount,
        row.found ? row.cost : 'Tidak ada jalur', number(row.timeMs)]);
    }
    byId('experiment-status').textContent = `${experiment.rows.length} kasus selesai. Rerata node mencakup peta tanpa jalur; rasio biaya mengecualikannya. Unduh CSV untuk data setiap kasus.`;
    byId('export').disabled = false;
  }

  function exportCSV() {
    if (!experiment) return;
    const csv = Experiments.toCSV(experiment);
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'eksperimen-ucs-astar.csv';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  byId('play').addEventListener('click', () => {
    if (timer) pause(); else {
      timer = setInterval(step, 350);
      byId('play').textContent = 'Ⅱ Jeda';
    }
    replan();
  });
  byId('step').addEventListener('click', () => { pause(); step(); });
  byId('reset').addEventListener('click', reset);
  mapSelect.addEventListener('change', reset);
  heuristicSelect.addEventListener('change', replan);
  byId('overlay').addEventListener('change', draw);
  byId('run-experiments').addEventListener('click', runExperiments);
  byId('export').addEventListener('click', exportCSV);
  document.querySelectorAll('[data-move]').forEach(button => button.addEventListener('click', () => {
    movePlayer(...button.dataset.move.split(',').map(Number));
  }));
  const keys = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1],
    ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };
  document.addEventListener('keydown', event => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
    const direction = keys[event.key] || keys[event.key.toLowerCase()];
    if (direction) { event.preventDefault(); movePlayer(...direction); }
  });
  canvas.addEventListener('click', event => {
    const bounds = canvas.getBoundingClientRect();
    const next = { x: Math.floor((event.clientX - bounds.left) / bounds.width * map.grid[0].length),
      y: Math.floor((event.clientY - bounds.top) / bounds.height * map.grid.length) };
    if (PathLab.isWalkable(map.grid, next)) { player = next; replan(); }
    canvas.focus({ preventScroll: true });
  });
  reset();
})();

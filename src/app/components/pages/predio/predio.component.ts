import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import gsap from 'gsap';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  selector: 'app-predio',
  standalone: true,
  templateUrl: './predio.component.html',
  styleUrl: './predio.component.css'
})
export class PredioComponent implements OnInit, AfterViewInit, OnDestroy {
  private standsDb: Array<any> = [];
  private standMeshesMap: Record<string, any> = {};
  private threeSceneDisposers: Array<() => void> = [];

  constructor(@Inject(PLATFORM_ID) private readonly platformId: Object) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.bindWindowGlobals();
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.initMasterPlan3D();
  }

  ngOnDestroy(): void {
    this.threeSceneDisposers.forEach(fn => fn());
  }

  private bindWindowGlobals(): void {
    const w = window as any;
    w.setMapFilter = this.setMapFilter.bind(this);
    w.searchMapStand = this.searchMapStand.bind(this);
    w.selectSectorMapa = this.selectSectorMapa.bind(this);
  }

  private initMasterPlan3D(): void {
    const canvas = document.getElementById('masterplanCanvas') as HTMLCanvasElement | null;
    const wrapper = document.getElementById('map-3d-wrapper');
    if (!canvas || !wrapper) return;

    const STATED_COMPANIES: Record<string, string[]> = {
      mineria: ["Jujuy Litio S.A.", "Exar Energ\u00eda & Litio", "Sales de Jujuy", "Mina Pirquitas", "JEMSE Estatal", "Lithium Tech Andes", "Puna Mining Corp", "Solar & Bater\u00edas Jujuy"],
      agro: ["Cooperativa de Tabacaleros", "Ledesma S.A.A.I.", "Valles Calchaqu\u00edes Gourmet", "Bodega Fernando", "Hortalizas Perico", "Finca El Cha\u00f1ar", "C\u00edtricos San Pedro"],
      tech: ["Polo Tecnol\u00f3gico Jujuy", "Telecom Argentina", "Banco Macro", "Consejo de la Microempresa", "Unju Innova", "BioJujuy Lab", "Andes Cloud Systems", "Fibra \u00d3ptica Jujuy"],
      artesanias: ["Hilander\u00edas de Yavi", "Cer\u00e1mica Quebrade\u00f1a", "Tejidos Puna Viva", "Orfebrer\u00eda Tilcare\u00f1a", "Maderas Nativas Yungas", "Filigrana de Humahuaca", "Telares de Casabindo"],
      gastro: ["Empanadas Las Vicu\u00f1itas", "Humitas Don Sixto", "Cerveza Tilcarock", "Asador Criollo Quebrade\u00f1o", "Chivito & Cordero Yala", "Tamales El Carmen", "GastroTruck Tilcara", "Alfajores Juje\u00f1itos"],
      maquinaria: ["Scania Camiones Puna", "Caterpillar Minera", "Toyota Hilux Derudder", "John Deere Agro", "Ford Trucks Jujuy", "Komatsu Maquinarias", "Agronorte Jujuy"]
    };

    const SECTOR_ACTIVITIES: Record<string, Array<{ nombre: string; hora: string; dia: string }>> = {
      cubierto: [
        { nombre: 'Cumbre del Tri\u00e1ngulo del Litio & Energ\u00edas Limpias', hora: '14:00 - 16:30', dia: '09 Oct' },
        { nombre: 'Panel de Innovaci\u00f3n Tecnol\u00f3gica del NOA', hora: '10:00 - 12:00', dia: '10 Oct' },
        { nombre: 'Mesa de Comercio Exterior e Inversiones', hora: '16:00 - 18:00', dia: '11 Oct' }
      ],
      artesano: [
        { nombre: 'Taller Vivo de Hilado y Te\u00f1ido en Lana de Llama', hora: '11:00 - 13:00', dia: '09-11 Oct' },
        { nombre: 'Muestra de Alfarer\u00eda y T\u00e9cnicas Ancestrales', hora: '15:30 - 17:30', dia: '09 Oct' }
      ],
      descubierto: [
        { nombre: 'Demostraci\u00f3n Din\u00e1mica de Maquinaria y Miner\u00eda', hora: '15:00 - 17:00', dia: '09 Oct' },
        { nombre: 'Test Drive de Veh\u00edculos 4x4 y Utilitarios El\u00e9ctricos', hora: '11:00 - 18:00', dia: '10 Oct' }
      ],
      gastronomico: [
        { nombre: 'Masterclass de Cocina Regional & Humitas Andinas', hora: '13:00 - 14:30', dia: '09 Oct' },
        { nombre: 'Festival de Cerveza Artesanal y Maridaje Andino', hora: '19:00 - 22:00', dia: '12 Oct' }
      ],
      espectaculos: [
        { nombre: 'Gran Noche Musical Andina — Escenario Mayor', hora: '20:30 - 23:30', dia: '09 Oct' },
        { nombre: 'Gala de Cierre y Espect\u00e1culo Folkl\u00f3rico', hora: '20:00 - 23:00', dia: '11 Oct' }
      ],
      conferencias: [
        { nombre: 'Acto Protocolar Inaugural con Autoridades', hora: '09:30 - 11:00', dia: '09 Oct' },
        { nombre: 'Foro Log\u00edstico del Corredor Bioce\u00e1nico', hora: '10:00 - 12:30', dia: '10 Oct' }
      ]
    };

    const STANDS_DB: Array<any> = [];
    let currentStandIndex = 0;

    const getRandomStatus = () => {
      const rand = Math.random();
      if (rand < 0.22) return 'disponible';
      if (rand < 0.50) return 'reservado';
      return 'ocupado';
    };

    const getRandomCompany = (categoryList: string[], status: string) => {
      if (status === 'disponible') return 'Espacio Disponible para Reserva';
      const list = categoryList || STATED_COMPANIES['tech'];
      return list[Math.floor(Math.random() * list.length)];
    };

    for (let i = 0; i < 4; i++) {
      currentStandIndex++;
      const id = `CUB-${String(currentStandIndex).padStart(2, '0')}`;
      const status = getRandomStatus();
      STANDS_DB.push({
        id,
        sectorKey: 'cubierto',
        sectorName: 'Pabell\u00f3n A - Cubiertos',
        rubro: 'Miner\u00eda, Litio & Energ\u00edas Renovables',
        company: getRandomCompany(STATED_COMPANIES['mineria'], status),
        x: -40 + i * 26,
        z: -19,
        w: 10,
        d: 5.5,
        h: 3.5,
        status,
        color: 0x00C2D1
      });
    }

    for (let i = 0; i < 3; i++) {
      currentStandIndex++;
      const id = `CUB-${String(currentStandIndex).padStart(2, '0')}`;
      const status = getRandomStatus();
      STANDS_DB.push({
        id,
        sectorKey: 'cubierto',
        sectorName: 'Pabell\u00f3n A - Cubiertos',
        rubro: 'Tecnolog\u00eda & Telecomunicaciones',
        company: getRandomCompany(STATED_COMPANIES['tech'], status),
        x: 41,
        z: -10 + i * 12,
        w: 6,
        d: 8,
        h: 3.5,
        status,
        color: 0x7E57C2
      });
    }

    for (let i = 0; i < 6; i++) {
      currentStandIndex++;
      const id = `ART-${String(i + 1).padStart(2, '0')}`;
      const status = getRandomStatus();
      STANDS_DB.push({
        id,
        sectorKey: 'artesano',
        sectorName: 'Sector de Artesan\u00edas',
        rubro: 'Artesan\u00edas & Tejidos Andinos',
        company: getRandomCompany(STATED_COMPANIES['artesanias'], status),
        x: -75 + (i % 2) * 8,
        z: -20 + Math.floor(i / 2) * 16,
        w: 5,
        d: 5,
        h: 2.8,
        status,
        color: 0xE879F9
      });
    }

    for (let i = 0; i < 4; i++) {
      currentStandIndex++;
      const id = `DESC-${String(i + 1).padStart(2, '0')}`;
      const status = getRandomStatus();
      STANDS_DB.push({
        id,
        sectorKey: 'descubierto',
        sectorName: '\u00c1rea Descubierta & Maquinarias',
        rubro: 'Maquinaria Pesada & Log\u00edstica',
        company: getRandomCompany(STATED_COMPANIES['maquinaria'], status),
        x: -30 + (i % 2) * 35,
        z: 40 + Math.floor(i / 2) * 20,
        w: 12,
        d: 10,
        h: 4.2,
        status,
        color: 0x00E5FF
      });
    }

    for (let i = 0; i < 4; i++) {
      currentStandIndex++;
      const id = `GAST-${String(i + 1).padStart(2, '0')}`;
      const status = getRandomStatus();
      STANDS_DB.push({
        id,
        sectorKey: 'gastronomico',
        sectorName: 'Polo Gastron\u00f3mico Regional',
        rubro: 'Gastronom\u00eda Tradicional Juje\u00f1a',
        company: getRandomCompany(STATED_COMPANIES['gastro'], status),
        x: 60,
        z: 35 + i * 10,
        w: 6,
        d: 6,
        h: 3.2,
        status,
        color: 0xFFB74D
      });
    }

    this.standsDb = STANDS_DB;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0814);
    scene.fog = new THREE.FogExp2(0x0a0814, 0.0055);

    const width = wrapper.clientWidth || 800;
    const height = wrapper.clientHeight || 500;

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    camera.position.set(70, 75, 95);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 25;
    controls.maxDistance = 220;
    controls.target.set(0, 0, 0);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00C2D1, 1.2);
    dirLight.position.set(60, 100, 40);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const violetLight = new THREE.DirectionalLight(0x9D4EDD, 0.9);
    violetLight.position.set(-60, 80, -40);
    scene.add(violetLight);

    const groundGeo = new THREE.PlaneGeometry(240, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x141122, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(240, 40, 0x00C2D1, 0x221a36);
    gridHelper.position.y = 0.05;
    scene.add(gridHelper);

    const roofGroup = new THREE.Group();
    const roofGeo = new THREE.BoxGeometry(100, 1.5, 52);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x5E3A8C,
      transparent: true,
      opacity: 0.45,
      roughness: 0.3
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 7.5, 0);
    roofGroup.add(roof);
    scene.add(roofGroup);

    const standMeshesMap: Record<string, any> = {};
    const interactiveMeshes: THREE.Mesh[] = [];

    STANDS_DB.forEach(stand => {
      const group = new THREE.Group();
      group.position.set(stand.x, 0, stand.z);

      const standGeo = new THREE.BoxGeometry(stand.w, stand.h, stand.d);
      const standMat = new THREE.MeshStandardMaterial({
        color: stand.color,
        roughness: 0.4,
        metalness: 0.1
      });
      const mesh = new THREE.Mesh(standGeo, standMat);
      mesh.position.y = stand.h / 2;
      mesh.castShadow = true;
      group.add(mesh);

      const hitGeo = new THREE.BoxGeometry(stand.w * 1.05, stand.h * 1.2, stand.d * 1.05);
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitBox = new THREE.Mesh(hitGeo, hitMat);
      hitBox.position.y = stand.h / 2;
      (hitBox as any).standData = stand;
      group.add(hitBox);

      interactiveMeshes.push(hitBox);
      scene.add(group);

      standMeshesMap[stand.id] = { group, mesh, hitBox, stand };
    });

    this.standMeshesMap = standMeshesMap;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let selectedStand: any = null;

    const selectStand = (standData: any) => {
      if (!standData) return;
      selectedStand = standData;

      const nombreEl = document.getElementById('map-info-nombre');
      const temaEl = document.getElementById('map-info-tematica');
      const standsEl = document.getElementById('map-info-stands');
      const expListEl = document.getElementById('map-info-expositores');
      const actListEl = document.getElementById('map-info-actividades');

      if (nombreEl) nombreEl.textContent = `${standData.id} · ${standData.sectorName}`;
      if (temaEl) temaEl.textContent = standData.rubro;
      if (standsEl) standsEl.textContent = `Empresa: ${standData.company} (${standData.status.toUpperCase()})`;

      if (expListEl) {
        expListEl.innerHTML = '';
        const list = STATED_COMPANIES[standData.sectorKey] || [standData.company];
        list.slice(0, 5).forEach(c => {
          const li = document.createElement('li');
          li.className = 'px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold';
          li.textContent = c;
          expListEl.appendChild(li);
        });
      }

      if (actListEl) {
        actListEl.innerHTML = '';
        const acts = SECTOR_ACTIVITIES[standData.sectorKey] || SECTOR_ACTIVITIES['cubierto'];
        acts.forEach(a => {
          const li = document.createElement('li');
          li.className = 'flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800';
          li.innerHTML = `<span>${a.nombre}</span><span class="font-bold text-primary dark:text-brand-cyan-electric">${a.hora}</span>`;
          actListEl.appendChild(li);
        });
      }

      const pinTagText = document.getElementById('pin-tag-text');
      if (pinTagText) pinTagText.textContent = `${standData.id}: ${standData.company.substring(0, 20)}`;
    };

    const onPointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object as any;
        if (hit.standData) {
          selectStand(hit.standData);
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    const floatingPin = document.getElementById('floating-pin');
    const updateFloatingPin = () => {
      if (!floatingPin || !selectedStand) return;
      const pos = new THREE.Vector3(selectedStand.x, selectedStand.h + 1.5, selectedStand.z);
      pos.project(camera);

      const x = (pos.x * 0.5 + 0.5) * renderer.domElement.clientWidth;
      const y = (-(pos.y * 0.5) + 0.5) * renderer.domElement.clientHeight;

      if (pos.z < 1) {
        floatingPin.style.display = 'block';
        floatingPin.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
      } else {
        floatingPin.style.display = 'none';
      }
    };

    const btnIso = document.getElementById('btnViewIso');
    const btnTop = document.getElementById('btnViewTop');
    const btnEntrance = document.getElementById('btnViewEntrance');
    const btnToggleRoof = document.getElementById('btnToggleRoof');

    const setActiveViewBtn = (activeBtn: HTMLElement | null) => {
      [btnIso, btnTop, btnEntrance].forEach(b => {
        if (b) b.classList.remove('active');
      });
      if (activeBtn) activeBtn.classList.add('active');
    };

    if (btnIso) {
      btnIso.addEventListener('click', () => {
        setActiveViewBtn(btnIso);
        gsap.to(camera.position, { x: 70, y: 75, z: 95, duration: 1.2 });
        gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.2 });
      });
    }

    if (btnTop) {
      btnTop.addEventListener('click', () => {
        setActiveViewBtn(btnTop);
        gsap.to(camera.position, { x: 0, y: 130, z: 0.1, duration: 1.2 });
        gsap.to(controls.target, { x: 0, y: 0, z: 0, duration: 1.2 });
      });
    }

    if (btnEntrance) {
      btnEntrance.addEventListener('click', () => {
        setActiveViewBtn(btnEntrance);
        gsap.to(camera.position, { x: -88, y: 12, z: 78, duration: 1.2 });
        gsap.to(controls.target, { x: -30, y: 5, z: 20, duration: 1.2 });
      });
    }

    if (btnToggleRoof) {
      btnToggleRoof.addEventListener('click', () => {
        roofGroup.visible = !roofGroup.visible;
        btnToggleRoof.classList.toggle('active', roofGroup.visible);
        btnToggleRoof.textContent = roofGroup.visible ? '\u{1F3DB} Techo: ON' : '\u{1F3DB} Techo: OFF';
      });
    }

    const btnZoomIn = document.getElementById('btnZoomIn3D');
    const btnZoomOut = document.getElementById('btnZoomOut3D');
    const btnResetView = document.getElementById('btnResetView3D');

    if (btnZoomIn) {
      btnZoomIn.addEventListener('click', () => {
        camera.fov = Math.max(20, camera.fov - 6);
        camera.updateProjectionMatrix();
      });
    }
    if (btnZoomOut) {
      btnZoomOut.addEventListener('click', () => {
        camera.fov = Math.min(75, camera.fov + 6);
        camera.updateProjectionMatrix();
      });
    }
    if (btnResetView) {
      btnResetView.addEventListener('click', () => {
        camera.fov = 45;
        camera.updateProjectionMatrix();
        if (btnIso) btnIso.click();
      });
    }

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    ro.observe(wrapper);

    let running = true;
    const renderLoop = () => {
      if (!running) return;
      controls.update();
      updateFloatingPin();
      renderer.render(scene, camera);
      requestAnimationFrame(renderLoop);
    };

    selectStand(STANDS_DB[0]);
    renderLoop();

    this.threeSceneDisposers.push(() => {
      running = false;
      ro.disconnect();
      renderer.dispose();
    });
  }

  setMapFilter(rubro: string): void {
    document.querySelectorAll('.map-filter-btn').forEach(b => b.classList.remove('active-filter'));
    const btn = document.querySelector(`[data-filter="${rubro}"]`);
    if (btn) btn.classList.add('active-filter');

    const key = (rubro || 'all').toLowerCase();
    this.standsDb.forEach(stand => {
      const item = this.standMeshesMap[stand.id];
      if (!item) return;

      const match = key === 'all' ||
        stand.rubro.toLowerCase().includes(key) ||
        stand.sectorName.toLowerCase().includes(key) ||
        stand.company.toLowerCase().includes(key);

      item.mesh.material.opacity = match ? 1.0 : 0.15;
      item.mesh.material.transparent = true;
    });
  }

  searchMapStand(): void {
    const input = document.getElementById('map-search') as HTMLInputElement | null;
    const query = input ? input.value.toLowerCase().trim() : '';

    this.standsDb.forEach(stand => {
      const item = this.standMeshesMap[stand.id];
      if (!item) return;

      const match = !query ||
        stand.id.toLowerCase().includes(query) ||
        stand.company.toLowerCase().includes(query) ||
        stand.rubro.toLowerCase().includes(query) ||
        stand.sectorName.toLowerCase().includes(query);

      item.mesh.material.opacity = match ? 1.0 : 0.12;
      item.mesh.material.transparent = true;
    });
  }

  selectSectorMapa(id: string): void {
    const sectorMapping: Record<string, string> = {
      'a': 'cubierto',
      'b': 'cubierto',
      'c': 'artesano',
      'gastronomico': 'gastronomico',
      'auditorio': 'conferencias',
      'estacionamiento': 'descubierto'
    };
    const targetSector = sectorMapping[id] || 'cubierto';
    const match = this.standsDb.find(s => s.sectorKey === targetSector);
    if (match && this.standMeshesMap[match.id]) {
      this.standMeshesMap[match.id].hitBox.dispatchEvent(new Event('pointerdown'));
    }
  }
}
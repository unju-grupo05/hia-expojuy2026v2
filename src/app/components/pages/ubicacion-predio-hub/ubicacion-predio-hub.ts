import { Component, OnInit, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as L from 'leaflet';

@Component({
  selector: 'app-ubicacion-predio-hub',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ubicacion-predio-hub.html',
  styleUrl: './ubicacion-predio-hub.css'
})
export class UbicacionPredioHubComponent implements OnInit, AfterViewInit, OnDestroy {
  public activeTab: 'predio' | 'ubicacion' = 'predio';

  private isBrowser: boolean;
  private threeEngineRunning = false;
  private threeDisposer: (() => void) | null = null;
  private standsDb: Array<any> = [];
  private standMeshesMap: Record<string, { mesh: THREE.Mesh; stand: any }> = {};

  constructor(@Inject(PLATFORM_ID) private readonly platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      (window as any).setMapFilter = this.setMapFilter.bind(this);
      (window as any).searchMapStand = this.searchMapStand.bind(this);
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    this.initMasterPlan3D();
  }

  ngOnDestroy(): void {
    if (this.threeDisposer) this.threeDisposer();
  }

  public switchTab(tab: 'predio' | 'ubicacion'): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;

    if (tab === 'predio') {
      this.threeEngineRunning = true;
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    } else {
      this.threeEngineRunning = false;
    }
  }

  /* ==================== VISTA 1: THREE.JS 3D ==================== */
  private initMasterPlan3D(): void {
    const canvas = document.getElementById('masterplanCanvas') as HTMLCanvasElement | null;
    const wrapper = document.getElementById('map-3d-wrapper');
    if (!canvas || !wrapper) return;

    // Base de datos de stands completa
    this.standsDb = [
      { id: 'CUB-01', sectorKey: 'cubierto', sectorName: 'Pabellón A - Cubiertos', rubro: 'mineria', rubroName: 'Minería, Litio & Energías', company: 'Jujuy Litio S.A.', x: -30, z: -10, w: 12, d: 8, h: 4, color: 0x00C2D1 },
      { id: 'CUB-02', sectorKey: 'cubierto', sectorName: 'Pabellón A - Cubiertos', rubro: 'energia', rubroName: 'Energía Solar y Sustentable', company: 'Solar & Baterías Jujuy', x: -10, z: -10, w: 12, d: 8, h: 4, color: 0x00E5FF },
      { id: 'CUB-03', sectorKey: 'cubierto', sectorName: 'Pabellón B - Tecnología', rubro: 'tecnologia', rubroName: 'Tecnología & Software', company: 'Andes Cloud Systems', x: 10, z: -10, w: 12, d: 8, h: 4, color: 0x7E57C2 },
      { id: 'AGRO-01', sectorKey: 'descubierto', sectorName: 'Sector Agroindustrial', rubro: 'agro', rubroName: 'Agroindustria & Campo', company: 'Ledesma S.A.A.I.', x: 30, z: -10, w: 12, d: 8, h: 4, color: 0x4CAF50 },
      { id: 'GAST-01', sectorKey: 'gastronomico', sectorName: 'Polo Gastronómico', rubro: 'gastronomia', rubroName: 'Gastronomía Regional', company: 'Empanadas Las Vicuñitas', x: -20, z: 20, w: 10, d: 8, h: 3, color: 0xFFB74D },
      { id: 'GAST-02', sectorKey: 'gastronomico', sectorName: 'Polo Gastronómico', rubro: 'gastronomia', rubroName: 'Gastronomía Regional', company: 'Asador Criollo Quebradeño', x: 0, z: 20, w: 10, d: 8, h: 3, color: 0xFF9800 }
    ];

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0b1a);

    const camera = new THREE.PerspectiveCamera(45, wrapper.clientWidth / wrapper.clientHeight, 1, 1000);
    camera.position.set(60, 65, 85);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00C2D1, 1.2);
    dirLight.position.set(50, 80, 30);
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(200, 30, 0x00C2D1, 0x221a36);
    scene.add(gridHelper);

    const interactiveMeshes: THREE.Mesh[] = [];
    this.standMeshesMap = {};

    this.standsDb.forEach(stand => {
      const group = new THREE.Group();
      group.position.set(stand.x, 0, stand.z);

      const geo = new THREE.BoxGeometry(stand.w, stand.h, stand.d);
      // Creamos un material estándar con soporte para transparencia/opacidad
      const mat = new THREE.MeshStandardMaterial({
        color: stand.color,
        roughness: 0.3,
        transparent: true,
        opacity: 1.0
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = stand.h / 2;
      (mesh as any).standData = stand;

      group.add(mesh);
      interactiveMeshes.push(mesh);
      scene.add(group);

      // Mapeamos el ID único del stand a la malla creada
      this.standMeshesMap[stand.id] = { mesh, stand };
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactiveMeshes);

      if (intersects.length > 0) {
        const stand = (intersects[0].object as any).standData;
        if (stand) {
          const nameEl = document.getElementById('map-info-nombre');
          const temaEl = document.getElementById('map-info-tematica');
          const descEl = document.getElementById('map-info-desc');
          
          if (nameEl) nameEl.textContent = `${stand.id} · ${stand.sectorName}`;
          if (temaEl) temaEl.textContent = stand.rubroName;
          if (descEl) descEl.textContent = `Expositor: ${stand.company} — Rubro: ${stand.rubroName}`;
        }
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // Resize Observer para responder a cambios de pantalla
    const ro = new ResizeObserver(() => {
      if (wrapper.clientWidth > 0 && wrapper.clientHeight > 0) {
        camera.aspect = wrapper.clientWidth / wrapper.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(wrapper.clientWidth, wrapper.clientHeight);
      }
    });
    ro.observe(wrapper);

    this.threeEngineRunning = true;
    const renderLoop = () => {
      if (this.threeEngineRunning) {
        controls.update();
        renderer.render(scene, camera);
      }
      requestAnimationFrame(renderLoop);
    };
    renderLoop();

    this.threeDisposer = () => {
      this.threeEngineRunning = false;
      ro.disconnect();
      renderer.dispose();
    };
  }

  /* ==================== MÉTODOS DE FILTRO Y BÚSQUEDA ==================== */
  public setMapFilter(rubro: string): void {
    // Actualizar estados visuales de los botones
    document.querySelectorAll('.map-filter-btn').forEach(b => b.classList.remove('active-filter'));
    const targetBtn = document.querySelector(`[data-filter="${rubro}"]`);
    if (targetBtn) targetBtn.classList.add('active-filter');

    const key = rubro.toLowerCase();

    this.standsDb.forEach(stand => {
      const item = this.standMeshesMap[stand.id];
      if (!item) return;

      const match = key === 'all' || stand.rubro.toLowerCase() === key || stand.rubroName.toLowerCase().includes(key);
      
      const mat = item.mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = match ? 1.0 : 0.12;
      mat.needsUpdate = true;
    });
  }

  public searchMapStand(): void {
    const input = document.getElementById('map-search') as HTMLInputElement | null;
    const query = input ? input.value.toLowerCase().trim() : '';

    this.standsDb.forEach(stand => {
      const item = this.standMeshesMap[stand.id];
      if (!item) return;

      const match = !query ||
        stand.id.toLowerCase().includes(query) ||
        stand.company.toLowerCase().includes(query) ||
        stand.rubroName.toLowerCase().includes(query) ||
        stand.sectorName.toLowerCase().includes(query);

      const mat = item.mesh.material as THREE.MeshStandardMaterial;
      mat.opacity = match ? 1.0 : 0.12;
      mat.needsUpdate = true;
    });
  }
}
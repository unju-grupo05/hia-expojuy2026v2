import type { NgZone } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { MasterplanDataService } from './masterplan-data.service';
import { StandData, PropItem, CommercialStatus } from '../components/models/stand.model';

export class Masterplan3dScene {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private sunLight!: THREE.DirectionalLight;
  private animationFrameId: number = 0;
  private clock = new THREE.Clock();

  private canvas!: HTMLCanvasElement;
  private wrapper!: HTMLElement;
  private pinElement!: HTMLElement;
  private pinTextElement!: HTMLElement;

  public pickableStands: THREE.Mesh[] = [];
  public standMeshes: THREE.Group[] = [];
  private standMeshesMap: Record<string, { group: THREE.Group; hitBox: THREE.Mesh; data: StandData }> = {};
  private animatedBanners: { mesh: THREE.Mesh; baseHeight: number; speed: number }[] = [];
  private highlightBox!: THREE.LineSegments;

  // Techo y vigas
  public roofGroup!: THREE.Group;
  public roofMat!: THREE.MeshStandardMaterial;
  public roofVisible = true;

  // Flyweight
  private carpetMaterialsCache: Map<number, THREE.MeshLambertMaterial> = new Map();
  private sharedMaterials: Map<string, THREE.Material> = new Map();

  private canvasTextures: Set<THREE.Texture> = new Set();

  /** Evita que `destroy()` se ejecute dos veces o tras un re-init. */
  private isDestroyed = false;

  private tempVec = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private currentSelectedStand: StandData | null = null;
  private standsGroup: THREE.Group = new THREE.Group();
  private activeStatusFilter: CommercialStatus | 'all' = 'all';
  private activeRubroFilter: string = 'all';
  private activeSearchQuery: string = '';

  private wheelHandler = (e: WheelEvent) => {
    e.preventDefault();
  };

  private resizeHandler = () => this.handleResize();
  private pointerDownHandler!: (e: PointerEvent) => void;

  constructor(
    private dataService: MasterplanDataService,
    private ngZone: NgZone
  ) { }

  public init(canvas: HTMLCanvasElement, wrapper: HTMLElement, pinEl: HTMLElement, pinTextEl: HTMLElement): void {
    this.isDestroyed = false;
    this.canvas = canvas;
    this.wrapper = wrapper;
    this.pinElement = pinEl;
    this.pinTextElement = pinTextEl;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#162230');
    // Niebla lineal suave que no oscurece los stands en el rango principal de visión
    this.scene.fog = new THREE.Fog(0x162230, 180, 520);

    const width = this.wrapper.clientWidth || 800;
    const height = this.wrapper.clientHeight || 500;

    this.camera = new THREE.PerspectiveCamera(42, width / height, 1, 1000);
    this.camera.position.set(130, 130, 130);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 420;
    this.controls.target.set(0, 0, 25);

    this.initSharedMaterials();
    this.initLights();

    this.buildGround();
    this.buildPavilionWithExactWalls();
    this.buildBoleteriaL();
    this.buildProps();
    this.buildAuxiliaryBuildings();
    this.buildPOIFlags();
    this.buildHighlightBox();

    this.standsGroup = new THREE.Group();
    this.scene.add(this.standsGroup);

    this.buildProceduralStands();

    this.setupEvents();

    this.ngZone.runOutsideAngular(() => {
      this.renderLoop();
    });

    const stands = this.dataService.getStandsProcessed();
    if (stands.length > 0) {
      this.selectStand(stands[0], false);
    }
  }

  private initSharedMaterials(): void {
    this.sharedMaterials.set('asphalt', new THREE.MeshLambertMaterial({ color: 0x0b1016 }));
    this.sharedMaterials.set('roadClosed', new THREE.MeshLambertMaterial({ color: 0x182230 }));
    this.sharedMaterials.set('walkwayYellow', new THREE.MeshLambertMaterial({ color: 0x1e2733 }));
    this.sharedMaterials.set('parcelWhite', new THREE.MeshLambertMaterial({ color: 0xffffff }));
    this.sharedMaterials.set('wallWhite', new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 }));
    this.sharedMaterials.set('counterDark', new THREE.MeshLambertMaterial({ color: 0x1f2937 }));
    this.sharedMaterials.set('cyanLine', new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 2 }));
    this.sharedMaterials.set('trussMetal', new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.25 }));
  }

  private getCarpetMaterial(colorHex: number): THREE.MeshLambertMaterial {
    if (!this.carpetMaterialsCache.has(colorHex)) {
      this.carpetMaterialsCache.set(colorHex, new THREE.MeshLambertMaterial({ color: colorHex }));
    }
    return this.carpetMaterialsCache.get(colorHex)!;
  }

  private initLights(): void {
    // Luz ambiental clara y envolvente
    const ambientLight = new THREE.AmbientLight(0xe0f2fe, 1.35);
    this.scene.add(ambientLight);

    // Luz de hemisferio: cielo diáfano + rebote de piso para erradicar sombras negras en recovecos
    const hemiLight = new THREE.HemisphereLight(0xe2e8f0, 0x1e293b, 0.85);
    this.scene.add(hemiLight);

    // Sol direccional principal con mayor intensidad
    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.45);
    this.sunLight.position.set(120, 180, 90);
    this.sunLight.castShadow = true;
    const shadowResolution = (typeof window !== 'undefined' && window.innerWidth < 768) ? 512 : 1024;
    this.sunLight.shadow.mapSize.set(shadowResolution, shadowResolution);
    this.scene.add(this.sunLight);

    // Luz de relleno contra-ángulo para iluminar laterales sombríos
    const fillLight = new THREE.DirectionalLight(0xc7d2fe, 0.50);
    fillLight.position.set(-90, 80, 80);
    this.scene.add(fillLight);

    // Acentos estéticos neón con presencia luminosa nítida
    const neonCyan = new THREE.DirectionalLight(0x00f0ff, 0.70);
    neonCyan.position.set(-100, 50, -60);
    this.scene.add(neonCyan);

    const neonOrange = new THREE.DirectionalLight(0xff7b00, 0.60);
    neonOrange.position.set(80, 40, 80);
    this.scene.add(neonOrange);
  }

  private buildGround(): void {
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(280, 280), this.sharedMaterials.get('asphalt'));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(280, 56, 0x2e445d, 0x1b2d40);
    grid.position.y = 0.01;
    this.scene.add(grid);

    const mainStreet = new THREE.Mesh(new THREE.PlaneGeometry(260, 16), this.sharedMaterials.get('roadClosed'));
    mainStreet.rotation.x = -Math.PI / 2;
    mainStreet.position.set(0, 0.02, 78);
    mainStreet.receiveShadow = true;
    this.scene.add(mainStreet);

    for (const offset of [-8.0, 8.0]) {
      const curb = new THREE.Mesh(new THREE.PlaneGeometry(260, 0.35), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
      curb.rotation.x = -Math.PI / 2;
      curb.position.set(0, 0.03, 78 + offset);
      this.scene.add(curb);
    }

    for (let rx = -120; rx <= 120; rx += 10) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(rx, 0.03, 78);
      this.scene.add(dash);
    }

    const walkwayGroup = new THREE.Group();
    const plazaWalkway = new THREE.Mesh(new THREE.PlaneGeometry(48, 44), this.sharedMaterials.get('walkwayYellow'));
    plazaWalkway.rotation.x = -Math.PI / 2;
    plazaWalkway.position.set(-10, 0.025, 48);
    walkwayGroup.add(plazaWalkway);

    const pathToDoor = new THREE.Mesh(new THREE.PlaneGeometry(26, 20), this.sharedMaterials.get('walkwayYellow'));
    pathToDoor.rotation.x = -Math.PI / 2;
    pathToDoor.position.set(0, 0.025, 26);
    walkwayGroup.add(pathToDoor);

    const pathToWestDoor = new THREE.Mesh(new THREE.PlaneGeometry(12, 30), this.sharedMaterials.get('walkwayYellow'));
    pathToWestDoor.rotation.x = -Math.PI / 2;
    pathToWestDoor.position.set(-48, 0.025, 12);
    walkwayGroup.add(pathToWestDoor);

    this.scene.add(walkwayGroup);
  }

  private buildPavilionWithExactWalls(): void {
    const pavilionGroup = new THREE.Group();
    const pavFloor = new THREE.Mesh(new THREE.PlaneGeometry(96, 50), new THREE.MeshLambertMaterial({ color: 0x223246 }));
    pavFloor.rotation.x = -Math.PI / 2;
    pavFloor.position.set(0, 0.03, 0);
    pavFloor.receiveShadow = true;
    pavilionGroup.add(pavFloor);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x334458, roughness: 0.45, metalness: 0.1, transparent: true, opacity: 0.92
    });

    const createWall = (w: number, h: number, d: number, x: number, y: number, z: number) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      wall.position.set(x, y, z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      pavilionGroup.add(wall);
    };

    // 1. Muro Norte continuo
    createWall(96, 4.5, 0.6, 0, 2.25, -25);

    // 2. Muro Oeste: Puerta Lateral en Z = 4.5
    createWall(0.6, 4.5, 27.0, -48, 2.25, -11.5);
    createWall(0.6, 1.3, 5.0, -48, 3.85, 4.5);
    createWall(0.6, 4.5, 18.0, -48, 2.25, 16.0);

    // 3. Muro Este: Puerta Este en Z = -3.5 (despejada frente a A5)
    createWall(0.6, 4.5, 19.0, 48, 2.25, -15.5);
    createWall(0.6, 1.3, 5.0, 48, 3.85, -3.5);
    createWall(0.6, 4.5, 26.0, 48, 2.25, 12.0);

    // 4. Muro Sur: Puertas Sur 1 (X = -25.5) y Sur 2 (X = 23.5)
    createWall(20.0, 4.5, 0.6, -38.0, 2.25, 25);
    createWall(5.0, 1.3, 0.6, -25.5, 3.85, 25);
    createWall(44.0, 4.5, 0.6, -1.0, 2.25, 25);
    createWall(5.0, 1.3, 0.6, 23.5, 3.85, 25);
    createWall(22.0, 4.5, 0.6, 37.0, 2.25, 25);

    this.scene.add(pavilionGroup);

    // Techo y vigas integrados en roofGroup
    this.roofGroup = new THREE.Group();
    this.roofMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, roughness: 0.4, metalness: 0.3, transparent: true, opacity: 0.88, side: THREE.DoubleSide
    });

    const halfX = 48.2;
    const zNorth = -25.2;
    const zSouth = 25.2;
    const yEaves = 4.5;
    const yPeak = 9.0;

    const roofGeo = new THREE.BufferGeometry();
    const roofVerts = new Float32Array([
      -halfX, yPeak, 0, halfX, yPeak, 0, halfX, yEaves, zNorth,
      -halfX, yPeak, 0, halfX, yEaves, zNorth, -halfX, yEaves, zNorth,
      halfX, yPeak, 0, -halfX, yPeak, 0, -halfX, yEaves, zSouth,
      halfX, yPeak, 0, -halfX, yEaves, zSouth, halfX, yEaves, zSouth,
      -halfX, yEaves, zNorth, -halfX, yEaves, zSouth, -halfX, yPeak, 0,
      halfX, yEaves, zSouth, halfX, yEaves, zNorth, halfX, yPeak, 0
    ]);
    roofGeo.setAttribute('position', new THREE.BufferAttribute(roofVerts, 3));
    roofGeo.computeVertexNormals();

    const roofMesh = new THREE.Mesh(roofGeo, this.roofMat);
    roofMesh.castShadow = true;
    this.roofGroup.add(roofMesh);

    const metalMat = this.sharedMaterials.get('trussMetal')!;
    for (let rx = -44; rx <= 44; rx += 11) {
      const tie = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 50), metalMat);
      tie.position.set(rx, 4.5, 0);
      this.roofGroup.add(tie);

      const kingPost = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.5, 0.22), metalMat);
      kingPost.position.set(rx, 6.75, 0);
      this.roofGroup.add(kingPost);
    }
    this.scene.add(this.roofGroup);
  }

  public setRoofVisibility(visible: boolean, animate: boolean = true): void {
    this.roofVisible = visible;
    if (!this.roofGroup) return;

    if (animate) {
      if (visible) {
        this.roofGroup.visible = true;
        gsap.to(this.roofMat, {
          opacity: 0.88,
          duration: 0.4
        });
      } else {
        gsap.to(this.roofMat, {
          opacity: 0,
          duration: 0.3,
          onComplete: () => {
            this.roofGroup.visible = false;
          }
        });
      }
    } else {
      this.roofMat.opacity = visible ? 0.88 : 0;
      this.roofGroup.visible = visible;
    }
  }

  private buildBoleteriaL(): void {
    const bolGroup = new THREE.Group();
    bolGroup.position.set(-105.0, 0, 59.0);
    bolGroup.rotation.y = 0.436;

    const matBolPink = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.35, metalness: 0.1 });
    const matBolRoof = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const matGlass = new THREE.MeshStandardMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.45 });
    const matCounter = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2 });

    const mainArmLength = 17.5;
    const mainArmWidth = 3.2;
    const mainArm = new THREE.Mesh(new THREE.BoxGeometry(mainArmLength, 3.2, mainArmWidth), matBolPink);
    mainArm.position.set(mainArmLength / 2, 1.6, mainArmWidth / 2);
    bolGroup.add(mainArm);

    const glassStrip = new THREE.Mesh(new THREE.BoxGeometry(mainArmLength - 1.5, 1.1, 0.2), matGlass);
    glassStrip.position.set(mainArmLength / 2, 1.7, -0.05);
    bolGroup.add(glassStrip);

    const counterShelf = new THREE.Mesh(new THREE.BoxGeometry(mainArmLength - 1.0, 0.15, 0.7), matCounter);
    counterShelf.position.set(mainArmLength / 2, 1.15, -0.25);
    bolGroup.add(counterShelf);

    const sideArmLength = 9.0;
    const sideArm = new THREE.Mesh(new THREE.BoxGeometry(mainArmWidth, 3.2, sideArmLength), matBolPink);
    sideArm.position.set(mainArmWidth / 2, 1.6, -sideArmLength / 2 + mainArmWidth);
    bolGroup.add(sideArm);

    const roofMain = new THREE.Mesh(new THREE.BoxGeometry(mainArmLength + 1.2, 0.35, mainArmWidth + 1.0), matBolRoof);
    roofMain.position.set(mainArmLength / 2, 3.35, mainArmWidth / 2);
    bolGroup.add(roofMain);

    const roofSide = new THREE.Mesh(new THREE.BoxGeometry(mainArmWidth + 1.0, 0.35, sideArmLength + 0.5), matBolRoof);
    roofSide.position.set(mainArmWidth / 2, 3.35, -sideArmLength / 2 + mainArmWidth);
    bolGroup.add(roofSide);

    const infoPillar = new THREE.Mesh(
      new THREE.CylinderGeometry(1.6, 1.6, 3.8, 24),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 })
    );
    infoPillar.position.set(mainArmWidth / 2, 1.9, mainArmWidth / 2);
    bolGroup.add(infoPillar);

    const iCanvas = document.createElement('canvas');
    iCanvas.width = 256;
    iCanvas.height = 256;
    const iCtx = iCanvas.getContext('2d')!;
    iCtx.fillStyle = '#0f172a';
    iCtx.fillRect(0, 0, 256, 256);
    iCtx.lineWidth = 12;
    iCtx.strokeStyle = '#00f0ff';
    iCtx.beginPath();
    iCtx.arc(128, 128, 105, 0, Math.PI * 2);
    iCtx.stroke();
    iCtx.fillStyle = '#00f0ff';
    iCtx.font = 'bold 150px serif';
    iCtx.textAlign = 'center';
    iCtx.textBaseline = 'middle';
    iCtx.fillText('i', 128, 130);

    const iTex = this.trackTexture(new THREE.CanvasTexture(iCanvas));
    iTex.needsUpdate = true;
    const iBadge = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.5),
      new THREE.MeshBasicMaterial({ map: iTex, transparent: true })
    );
    iBadge.position.set(mainArmWidth / 2, 2.5, -0.4);
    bolGroup.add(iBadge);

    const bCanvas = document.createElement('canvas');
    bCanvas.width = 512;
    bCanvas.height = 128;
    const bCtx = bCanvas.getContext('2d')!;
    bCtx.fillStyle = '#0f172a';
    bCtx.fillRect(0, 0, 512, 128);
    bCtx.lineWidth = 8;
    bCtx.strokeStyle = '#f43f5e';
    bCtx.strokeRect(8, 8, 496, 112);
    bCtx.fillStyle = '#ffffff';
    bCtx.font = 'bold 44px sans-serif';
    bCtx.textAlign = 'center';
    bCtx.textBaseline = 'middle';
    bCtx.fillText('★ BOLETERÍAS ★', 256, 64);

    const signTex = this.trackTexture(new THREE.CanvasTexture(bCanvas));
    signTex.needsUpdate = true;
    const signMesh = new THREE.Mesh(
      new THREE.BoxGeometry(9.0, 1.0, 0.15),
      new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.3 })
    );
    signMesh.position.set(mainArmLength / 2, 3.9, 0.0);
    bolGroup.add(signMesh);

    this.scene.add(bolGroup);
  }

  private buildProps(): void {
    const payload = this.dataService.BLENDER_PAYLOAD;

    const portico = payload.portico;
    const porticoGroup = new THREE.Group();
    porticoGroup.position.set(portico.x, 0, portico.z);
    porticoGroup.rotation.y = Math.PI / 2;

    const pCanvas = document.createElement('canvas');
    pCanvas.width = 1024;
    pCanvas.height = 256;
    const ctx = pCanvas.getContext('2d')!;
    ctx.fillStyle = '#070e17';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#00f0ff';
    ctx.strokeRect(10, 10, 1004, 236);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f59e0b';
    ctx.strokeRect(20, 20, 984, 216);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('★ CIUDAD CULTURAL • SAN SALVADOR DE JUJUY ★', 512, 55);

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 18;
    ctx.font = '900 64px sans-serif';
    ctx.fillText('EXPOJUY 2026', 512, 125);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('CONECTANDO PAÍSES • CREANDO OPORTUNIDADES', 512, 190);

    const porticoTex = this.trackTexture(new THREE.CanvasTexture(pCanvas));
    porticoTex.needsUpdate = true;

    const beamMat = new THREE.MeshBasicMaterial({ map: porticoTex });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(16, 2.8, 1.6), beamMat);
    beam.position.y = 5.8;
    porticoGroup.add(beam);

    const colMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const leftCol = new THREE.Mesh(new THREE.BoxGeometry(2.0, 7.2, 1.8), colMat);
    leftCol.position.set(-7.5, 3.6, 0);
    porticoGroup.add(leftCol);

    const rightCol = new THREE.Mesh(new THREE.BoxGeometry(2.0, 7.2, 1.8), colMat);
    rightCol.position.set(7.5, 3.6, 0);
    porticoGroup.add(rightCol);

    this.scene.add(porticoGroup);

    payload.props.forEach(prop => {
      if (prop.id === 'DEC_01' || prop.id.includes('DEC_01')) return;

      if (prop.subtipo === 'tinglado_foodtrucks' || prop.id.includes('FOOD')) {
        this.createTingladoFoodCourt(prop);
      } else if (prop.subtipo === 'rotonda_peatonal' || prop.id.includes('ROTONDA')) {
        const radius = Math.max(prop.w, prop.l) / 2 || 10.32;
        const rotondaMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(radius, radius, 0.12, 48),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
        );
        rotondaMesh.position.set(prop.x, 0.06, prop.z);
        this.scene.add(rotondaMesh);

        const ringGeo = new THREE.RingGeometry(radius - 0.35, radius, 48);
        const ringMesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide }));
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.set(prop.x, 0.13, prop.z);
        this.scene.add(ringMesh);
      }
    });
  }

  private createTingladoFoodCourt(prop: PropItem): void {
    const tGroup = new THREE.Group();
    tGroup.position.set(prop.x, 0, prop.z);
    tGroup.rotation.y = prop.rotY || 0;

    const w = prop.w;
    const l = prop.l;
    const hTotal = prop.h || 8.8;
    const hEaves = hTotal * 0.65;

    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.14, l),
      new THREE.MeshStandardMaterial({ color: 0x1a2332, roughness: 0.8 })
    );
    floor.position.y = 0.07;
    tGroup.add(floor);

    const colMat = this.sharedMaterials.get('trussMetal')!;
    const colGeo = new THREE.BoxGeometry(0.4, hEaves, 0.4);
    const xCols = [-w / 2 + 0.6, 0, w / 2 - 0.6];
    const zCols = [-l / 2 + 0.6, l / 2 - 0.6];

    xCols.forEach(cx => {
      zCols.forEach(cz => {
        const col = new THREE.Mesh(colGeo, colMat);
        col.position.set(cx, hEaves / 2, cz);
        col.castShadow = true;
        tGroup.add(col);
      });
      const trussBeam = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, l - 1.0), colMat);
      trussBeam.position.set(cx, hEaves, 0);
      tGroup.add(trussBeam);
    });

    const rGeo = new THREE.BufferGeometry();
    const hw = w / 2 + 0.3;
    const hl = l / 2 + 0.3;
    const rVerts = new Float32Array([
      -hw, hEaves, -hl, hw, hEaves, -hl, hw, hTotal, 0,
      -hw, hEaves, -hl, hw, hTotal, 0, -hw, hTotal, 0,
      -hw, hTotal, 0, hw, hTotal, 0, hw, hEaves, hl,
      -hw, hTotal, 0, hw, hEaves, hl, -hw, hEaves, hl,
      -hw, hEaves, -hl, -hw, hTotal, 0, -hw, hEaves, hl,
      hw, hEaves, -hl, hw, hEaves, hl, hw, hTotal, 0
    ]);
    rGeo.setAttribute('position', new THREE.BufferAttribute(rVerts, 3));
    rGeo.computeVertexNormals();

    const roofSkin = new THREE.Mesh(
      rGeo,
      new THREE.MeshStandardMaterial({ color: 0x223249, roughness: 0.35, metalness: 0.6, side: THREE.DoubleSide })
    );
    tGroup.add(roofSkin);

    const truckPositions = [-w / 3, 0, w / 3];
    truckPositions.forEach((tx, idx) => {
      const truck = new THREE.Mesh(
        new THREE.BoxGeometry(4.4, 2.2, 2.4),
        new THREE.MeshStandardMaterial({ color: idx % 2 === 0 ? 0xdc2626 : 0x0284c7, roughness: 0.4 })
      );
      truck.position.set(tx, 1.15, -l / 4);
      tGroup.add(truck);
    });

    this.scene.add(tGroup);
  }

  private buildAuxiliaryBuildings(): void {
    const stageGroup = new THREE.Group();
    stageGroup.position.set(-80, 0, 95);
    const base = new THREE.Mesh(new THREE.BoxGeometry(16, 1.5, 10), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 }));
    base.position.set(0, 0.75, 0);
    stageGroup.add(base);

    const stageRoof = new THREE.Mesh(new THREE.BoxGeometry(17, 0.4, 11), new THREE.MeshStandardMaterial({ color: 0x334155 }));
    stageRoof.position.set(0, 7.2, 0);
    stageGroup.add(stageRoof);

    const ledScreen = new THREE.Mesh(new THREE.PlaneGeometry(13, 5), new THREE.MeshBasicMaterial({ color: 0x00f0ff }));
    ledScreen.position.set(0, 4.2, 4.9);
    stageGroup.add(ledScreen);
    this.scene.add(stageGroup);

    const createSameUnit = (x: number, z: number, cz: number) => {
      const same = new THREE.Mesh(
        new THREE.BoxGeometry(12, 3.5, 8),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 })
      );
      same.position.set(x, 1.75, z);
      this.scene.add(same);

      const crossH = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.8, 0.1), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      crossH.position.set(x, 2.5, cz);
      this.scene.add(crossH);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.5, 0.1), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      crossV.position.set(x, 2.5, cz);
      this.scene.add(crossV);
    };

    createSameUnit(-66, -24, -19.9);
    createSameUnit(-62, 120, 115.9);

    const jGroup = new THREE.Group();
    jGroup.position.set(45, 0, 92);
    const groundJ = new THREE.Mesh(new THREE.PlaneGeometry(28, 20), new THREE.MeshLambertMaterial({ color: 0x065f46 }));
    groundJ.rotation.x = -Math.PI / 2;
    groundJ.position.y = 0.03;
    jGroup.add(groundJ);

    const inflable = new THREE.Mesh(new THREE.BoxGeometry(10, 4.5, 10), new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 }));
    inflable.position.set(0, 2.25, 0);
    jGroup.add(inflable);
    this.scene.add(jGroup);
  }

  private buildPOIFlags(): void {
    const metalMat = this.sharedMaterials.get('trussMetal')!;

    this.dataService.POI_LIST.forEach(poi => {
      const flagGroup = new THREE.Group();
      flagGroup.position.set(poi.x, 0, poi.z);

      // Mástil y base más prominentes y estilizados
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, poi.y + 1.0), metalMat);
      pole.position.y = (poi.y + 1.0) / 2;
      flagGroup.add(pole);

      const ball = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 16), new THREE.MeshBasicMaterial({ color: poi.color }));
      ball.position.y = poi.y + 1.0;
      flagGroup.add(ball);

      // Canvas de alta definición para texto hiper-nítido y grande
      const bCanvas = document.createElement('canvas');
      bCanvas.width = 1280;
      bCanvas.height = 420;
      const bCtx = bCanvas.getContext('2d')!;

      // Fondo oscuro translúcido con curvatura elegante
      bCtx.fillStyle = 'rgba(12, 18, 28, 0.96)';
      bCtx.beginPath();
      bCtx.roundRect(16, 16, 1248, 388, 52);
      bCtx.fill();

      // Borde grueso de color identificatorio del POI
      bCtx.lineWidth = 22;
      bCtx.strokeStyle = '#' + poi.color.toString(16).padStart(6, '0');
      bCtx.stroke();

      // Pastilla de acento decorativa superior
      bCtx.fillStyle = '#' + poi.color.toString(16).padStart(6, '0');
      bCtx.beginPath();
      bCtx.roundRect(460, 24, 360, 14, 7);
      bCtx.fill();

      // Título principal del Punto de Interés (grande, nítido y legible desde lejos)
      bCtx.fillStyle = '#ffffff';
      bCtx.font = 'bold 84px sans-serif';
      bCtx.textAlign = 'center';
      bCtx.textBaseline = 'middle';
      bCtx.fillText(poi.label, 640, 145);

      // Subtítulo con el color institucional del POI
      bCtx.fillStyle = '#' + poi.color.toString(16).padStart(6, '0');
      bCtx.font = 'bold 50px sans-serif';
      bCtx.fillText(poi.sub, 640, 275);

      const bannerTex = this.trackTexture(new THREE.CanvasTexture(bCanvas));
      bannerTex.needsUpdate = true;

      // Geometría del cartel: Dimensiones ampliadas al doble (18.0m x 5.8m vs 9.0m x 2.8m original)
      const bannerMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(18.0, 5.8),
        new THREE.MeshBasicMaterial({ map: bannerTex, transparent: true, side: THREE.DoubleSide })
      );
      bannerMesh.position.set(0, poi.y + 4.2, 0);
      flagGroup.add(bannerMesh);

      // HitBox ampliado para permitir clickeado ágil y cómodo desde cualquier distancia
      const hitBox = new THREE.Mesh(
        new THREE.BoxGeometry(19.0, poi.y + 8.0, 7.0),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitBox.position.y = (poi.y + 8.0) / 2;

      const poiStandPayload: StandData = {
        id: poi.id,
        name: poi.label,
        company: poi.label,
        rubro: poi.sub,
        sectorKey: 'all',
        sectorName: "Puntos de Interés ExpoJuy",
        area: "Infraestructura y Servicios",
        status: "disponible",
        carpetColor: poi.color,
        desc: poi.desc,
        x: poi.x,
        y: poi.y,
        z: poi.z,
        rotY: 0,
        type: 'cubierto',
        w: 6.0,
        l: 6.0,
        isPOI: true
      };

      hitBox.userData = { standData: poiStandPayload, groupRef: flagGroup };
      flagGroup.add(hitBox);
      this.pickableStands.push(hitBox);
      this.scene.add(flagGroup);

      // Velocidad fija: el visor debe ser reproducible entre recargas
      this.animatedBanners.push({ mesh: bannerMesh, baseHeight: poi.y + 4.2, speed: 2 });
    });
  }

  /**
   * Renderiza y actualiza los stands en Three.js de manera reactiva e independiente
   * de la infraestructura base (suelo, galpon, vigas, luces).
   * Itera exclusivamente sobre los stands devueltos por el backend.
   */
  public updateStands(stands: StandData[]): void {
    if (this.isDestroyed || !stands) return;

    if (!this.standsGroup) {
      this.standsGroup = new THREE.Group();
    }
    if (this.scene && !this.scene.children.includes(this.standsGroup)) {
      this.scene.add(this.standsGroup);
    }

    // 1. Limpiar mallas previas de standsGroup
    while (this.standsGroup.children.length > 0) {
      const child = this.standsGroup.children[0];
      this.standsGroup.remove(child);
      child.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
      });
    }

    this.pickableStands = [];
    this.standMeshes = [];
    this.standMeshesMap = {};

    if (stands.length === 0) {
      if (this.highlightBox) this.highlightBox.visible = false;
      return;
    }

    const metalMat = this.sharedMaterials.get('trussMetal')!;
    const wallWhite = this.sharedMaterials.get('wallWhite')!;
    const counterDark = this.sharedMaterials.get('counterDark')!;

    // 2. Renderizar mallas iterando sobre los stands provistos
    stands.forEach(data => {
      const isCedido = data.status === 'cedido';
      const isReservado = data.status === 'reservado';
      const cleanId = (data.id || '').toUpperCase().replace(/^(CUB-POL-|CUB-PL-|CUB-TRI-|CUB-|CORP-|EXT-P-|MAQ-)/, '');
      const standNum = parseInt(cleanId.replace(/\D/g, '')) || 0;
      if (cleanId === 'A2') {
        return;
      }

      const standGroup = new THREE.Group();
      standGroup.position.set(data.x, 0.04, data.z);
      standGroup.rotation.y = data.rotY || 0;

      // 1. STAND TRIANGULAR: A6, C35-C42 o type triangular
      if (data.type === 'triangular' || cleanId === 'A6' || data.id === 'CUB-TRI-A6' || cleanId.startsWith('TRI') || (cleanId.startsWith('C') && parseInt(cleanId.slice(1)) >= 35 && parseInt(cleanId.slice(1)) <= 42)) {
        const hw = data.w / 2;
        const hl = data.l / 2;
        const shape = new THREE.Shape();
        shape.moveTo(-hw, -hl);
        shape.lineTo(hw, -hl);
        shape.lineTo(0, hl);
        shape.closePath();

        const triGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
        const carpetColor = isCedido ? 0x8b5cf6 : (isReservado ? 0xfacc15 : 0x1d4ed8);
        const triMat = new THREE.MeshStandardMaterial({ color: carpetColor, roughness: 0.35 });
        const triMesh = new THREE.Mesh(triGeo, triMat);
        triMesh.rotation.x = -Math.PI / 2;
        triMesh.position.y = 0.05;
        standGroup.add(triMesh);

        const roofTri = new THREE.Mesh(triGeo, new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 }));
        roofTri.rotation.x = -Math.PI / 2;
        roofTri.position.y = 3.6;
        standGroup.add(roofTri);

        [[0, -hl + 0.6], [hw - 0.6, hl - 0.6], [-hw + 0.6, hl - 0.6]].forEach(pt => {
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.6), metalMat);
          col.position.set(pt[0], 1.8, pt[1]);
          standGroup.add(col);
        });
      }
      // 2. STAND A1: Polígono con ochava orientada al pasillo interior (geometría original oficial de plano)
      else if (cleanId === 'A1' || data.id === 'CUB-POL-A1') {
        const hw = data.w / 2;
        const hl = data.l / 2;
        const shape = new THREE.Shape();
        shape.moveTo(-hw, hl);
        shape.lineTo(hw, hl);
        shape.lineTo(hw, hl - 2.5);
        shape.lineTo(-hw + 2.5, -hl);
        shape.lineTo(-hw, -hl);
        shape.closePath();

        const a1Geo = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
        const carpetColor = isCedido ? 0x8b5cf6 : (isReservado ? 0xfacc15 : 0x1e40af);
        const a1Mat = new THREE.MeshStandardMaterial({ color: carpetColor, roughness: 0.35 });
        const a1Mesh = new THREE.Mesh(a1Geo, a1Mat);
        a1Mesh.rotation.x = -Math.PI / 2;
        a1Mesh.position.y = 0.05;
        standGroup.add(a1Mesh);

        const a1Roof = new THREE.Mesh(a1Geo, new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 }));
        a1Roof.rotation.x = -Math.PI / 2;
        a1Roof.position.y = 3.6;
        standGroup.add(a1Roof);

        [[-hw + 0.5, -hl + 0.5], [hw - 0.5, -hl + 0.5], [hw - 0.5, -hl + 2.5], [-hw + 2.5, hl - 0.5], [-hw + 0.5, hl - 0.5]].forEach(pt => {
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.6), metalMat);
          col.position.set(pt[0], 1.8, pt[1]);
          standGroup.add(col);
        });
      }
      // 3. PLANTA LIBRE RECTANGULAR: A5 o type planta_libre
      else if (data.type === 'planta_libre' || cleanId === 'A5' || data.id === 'CUB-PL-A5') {
        const carpetColor = isCedido ? 0x8b5cf6 : (isReservado ? 0xfacc15 : 0x1e40af);
        const carpet = new THREE.Mesh(
          new THREE.BoxGeometry(data.w - 0.2, 0.08, data.l - 0.2),
          new THREE.MeshStandardMaterial({ color: carpetColor, roughness: 0.4 })
        );
        carpet.position.y = 0.04;
        standGroup.add(carpet);

        const roofA5 = new THREE.Mesh(new THREE.BoxGeometry(data.w, 0.2, data.l), new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 }));
        roofA5.position.y = 3.6;
        standGroup.add(roofA5);

        for (const cx of [-data.w / 2 + 0.5, data.w / 2 - 0.5]) {
          for (const cz of [-data.l / 2 + 0.5, data.l / 2 - 0.5]) {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 3.6), metalMat);
            pole.position.set(cx, 1.8, cz);
            standGroup.add(pole);
          }
        }
      }
      // 4. LOTES CORPORATIVOS: F1, F2, G1-G3, CORP- o type corporativo
      else if (data.type === 'corporativo' || data.id.startsWith('CORP-') || cleanId.startsWith('F') || (cleanId.startsWith('G') && standNum >= 1 && standNum <= 3)) {
        const deck = new THREE.Mesh(
          new THREE.BoxGeometry(data.w, 0.18, data.l),
          new THREE.MeshStandardMaterial({ color: 0x18202c, roughness: 0.45, metalness: 0.25 })
        );
        deck.position.y = 0.09;
        deck.receiveShadow = true;
        standGroup.add(deck);

        const accentColor = isCedido ? 0x8b5cf6 : 0xff7b00;
        const borderGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(data.w, data.l));
        const border = new THREE.LineSegments(borderGeo, new THREE.LineBasicMaterial({ color: accentColor, linewidth: 3 }));
        border.rotation.x = -Math.PI / 2;
        border.position.y = 0.185;
        standGroup.add(border);

        const beaconMat = new THREE.MeshBasicMaterial({ color: accentColor });
        for (const cx of [-data.w / 2 + 0.4, data.w / 2 - 0.4]) {
          for (const cz of [-data.l / 2 + 0.4, data.l / 2 - 0.4]) {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 3.2), metalMat);
            pole.position.set(cx, 1.6, cz);
            standGroup.add(pole);
            const lightCap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), beaconMat);
            lightCap.position.set(cx, 3.2, cz);
            standGroup.add(lightCap);
          }
        }
      }
      // 5. MAQUINARIAS Y VEHÍCULOS (descubierto)
      else if (data.type === 'descubierto' || data.id.startsWith('MAQ-') || cleanId.startsWith('H') || (cleanId.startsWith('G') && standNum >= 4)) {
        const parcelBase = new THREE.Mesh(
          new THREE.BoxGeometry(data.w, 0.06, data.l),
          this.sharedMaterials.get('parcelWhite')!
        );
        parcelBase.position.y = 0.03;
        standGroup.add(parcelBase);

        const accentColor = isCedido ? 0x8b5cf6 : 0x00f0ff;
        const borderGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(data.w, data.l));
        const border = new THREE.LineSegments(borderGeo, new THREE.LineBasicMaterial({ color: accentColor, linewidth: 2 }));
        border.rotation.x = -Math.PI / 2;
        border.position.y = 0.065;
        standGroup.add(border);

        const cornerMat = new THREE.MeshBasicMaterial({ color: accentColor });
        for (const cx of [-data.w / 2, data.w / 2]) {
          for (const cz of [-data.l / 2, data.l / 2]) {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.4), cornerMat);
            pole.position.set(cx, 0.7, cz);
            standGroup.add(pole);
          }
        }

        if (standNum % 2 === 0) {
          const carGroup = new THREE.Group();
          const carBody = new THREE.Mesh(
            new THREE.BoxGeometry(2.2, 1.1, 4.6),
            new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.6, roughness: 0.3 })
          );
          carBody.position.y = 0.75;
          carGroup.add(carBody);

          const cabin = new THREE.Mesh(
            new THREE.BoxGeometry(2.0, 0.85, 2.3),
            new THREE.MeshStandardMaterial({ color: 0x0f172a })
          );
          cabin.position.set(0, 1.4, -0.4);
          carGroup.add(cabin);
          standGroup.add(carGroup);
        } else {
          const machine = new THREE.Mesh(
            new THREE.BoxGeometry(3.0, 2.2, 3.0),
            new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 })
          );
          machine.position.y = 1.1;
          standGroup.add(machine);
        }
      }
      // 6. STANDS MODULARES (cubierto / artesano / fallback general)
      else {
        const carpetColor = isCedido ? 0x8b5cf6 : (data.carpetColor || 0x334155);
        const carpet = new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(0.2, data.w - 0.08), 0.05, Math.max(0.2, data.l - 0.08)),
          this.getCarpetMaterial(carpetColor)
        );
        carpet.position.y = 0.025;
        carpet.receiveShadow = true;
        standGroup.add(carpet);

        const wallH = data.h || (data.type === 'artesano' ? 2.0 : 2.4);
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(data.w, wallH, 0.06), wallWhite);
        backWall.position.set(0, wallH / 2, -data.l / 2 + 0.03);
        standGroup.add(backWall);

        const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.06, wallH, data.l * 0.8), wallWhite);
        sideWall.position.set(-data.w / 2 + 0.03, wallH / 2, -data.l * 0.1);
        standGroup.add(sideWall);

        const fascia = new THREE.Mesh(new THREE.BoxGeometry(data.w, 0.35, 0.08), wallWhite);
        fascia.position.set(0, wallH - 0.18, data.l / 2 - 0.04);
        standGroup.add(fascia);

        const counter = new THREE.Mesh(new THREE.BoxGeometry(data.w * 0.45, 0.95, 0.5), counterDark);
        counter.position.set(data.w * 0.2, 0.48, data.l * 0.15);
        standGroup.add(counter);
      }

      // HitBox interactivo para Raycaster
      const hitBox = new THREE.Mesh(
        new THREE.BoxGeometry(data.w, data.h || 3.0, data.l),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitBox.position.y = (data.h || 3.0) / 2;
      hitBox.userData = { standData: data, groupRef: standGroup };
      standGroup.add(hitBox);
      this.pickableStands.push(hitBox);

      this.standsGroup.add(standGroup);
      this.standMeshesMap[data.id] = { group: standGroup, hitBox, data };
      this.standMeshes.push(standGroup);
    });

    // Enlazar A2 al stand unificado A1 para interactividad en el mapa
    const a1Entry = this.standMeshesMap['A1'] || this.standMeshesMap['CUB-POL-A1'];
    if (a1Entry && !this.standMeshesMap['A2']) {
      const a2Data = stands.find(s => s.id === 'A2');
      if (a2Data) {
        this.standMeshesMap['A2'] = { group: a1Entry.group, hitBox: a1Entry.hitBox, data: a2Data };
      }
    }

    // 3. Selección y filtros
    if (this.currentSelectedStand) {
      const match = stands.find(s => s.id === this.currentSelectedStand!.id);
      if (match) {
        this.selectStand(match, false);
      } else if (stands.length > 0) {
        this.selectStand(stands[0], false);
      }
    } else if (stands.length > 0) {
      this.selectStand(stands[0], false);
    }

    if (this.activeStatusFilter && this.activeStatusFilter !== 'all') {
      this.applyStatusFilter(this.activeStatusFilter);
    } else if (this.activeRubroFilter && this.activeRubroFilter !== 'all') {
      this.applyFilter(this.activeRubroFilter);
    }
  }

  public buildProceduralStands(): void {
    const stands = this.dataService.stands().length > 0
      ? this.dataService.stands()
      : this.dataService.getStandsProcessed();
    if (stands.length > 0) {
      this.rebuildStands(stands);
    }
  }

  public createStands(stands: StandData[]): void {
    this.updateStands(stands);
  }

  public rebuildStands(stands: StandData[]): void {
    this.updateStands(stands);
  }
  private buildHighlightBox(): void {
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const edges = new THREE.EdgesGeometry(boxGeo);
    this.highlightBox = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x00f0ff, linewidth: 3 }));
    this.highlightBox.visible = false;
    this.scene.add(this.highlightBox);
  }

  private setupEvents(): void {
    window.addEventListener('resize', this.resizeHandler);

    // Bloquea el scroll del body de la página al usar la rueda del mouse en el canvas
    this.canvas.addEventListener('wheel', this.wheelHandler, { passive: false });

    this.pointerDownHandler = (e: PointerEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.pickableStands, false);

      if (hits.length > 0) {
        const standData: StandData = hits[0].object.userData['standData'];
        this.selectStand(standData);
      }
    };
    this.canvas.addEventListener('pointerdown', this.pointerDownHandler);
  }

  public selectStand(standData: StandData, animateCamera: boolean = true): void {
    if (!standData) return;
    this.currentSelectedStand = standData;

    this.ngZone.run(() => {
      this.dataService.selectStand(standData);
    });

    const compName = standData.company || 'Punto Oficial';
    if (this.pinTextElement) {
      this.pinTextElement.innerText = `${standData.id} • ${compName.substring(0, 20)}`;
    }

    if (this.highlightBox) {
      this.highlightBox.scale.set(standData.w + 0.4, standData.h || 2.5, standData.l + 0.4);
      this.highlightBox.position.set(standData.x, (standData.h || 2.5) / 2, standData.z);
      this.highlightBox.rotation.y = standData.rotY || 0;
      this.highlightBox.visible = true;
    }

    if (animateCamera) {
      gsap.killTweensOf(this.controls.target);
      gsap.to(this.controls.target, {
        x: standData.x,
        y: 1.0,
        z: standData.z,
        duration: 1.2,
        ease: 'power3.out'
      });
    }
  }

  public setCameraView(mode: 'iso' | 'top' | 'entrance'): void {
    gsap.killTweensOf(this.camera.position);
    gsap.killTweensOf(this.controls.target);
    gsap.killTweensOf(this.camera);

    if (mode === 'iso') {
      this.setRoofVisibility(true);
      gsap.to(this.camera.position, { x: 130, y: 130, z: 130, duration: 1.6, ease: 'power3.inOut' });
      gsap.to(this.controls.target, { x: 0, y: 2, z: 25, duration: 1.6, ease: 'power3.inOut' });
      gsap.to(this.camera, { zoom: 1.0, duration: 1.6, onUpdate: () => this.camera.updateProjectionMatrix() });
    } else if (mode === 'top') {
      // En vista cenital se apagan de inmediato techo y vigas
      this.setRoofVisibility(false, false);
      gsap.to(this.camera.position, { x: 0, y: 220, z: 28.001, duration: 1.5, ease: 'power3.inOut' });
      gsap.to(this.controls.target, { x: 0, y: 0, z: 28, duration: 1.5, ease: 'power3.inOut' });
      gsap.to(this.camera, { zoom: 1.25, duration: 1.5, onUpdate: () => this.camera.updateProjectionMatrix() });
    } else if (mode === 'entrance') {
      const portico = this.dataService.BLENDER_PAYLOAD.portico;
      this.setRoofVisibility(true);
      gsap.to(this.camera.position, { x: portico.x - 22, y: 6.0, z: portico.z, duration: 1.6, ease: 'power3.inOut' });
      gsap.to(this.controls.target, { x: portico.x + 12, y: 4.0, z: portico.z - 8, duration: 1.6, ease: 'power3.inOut' });
      gsap.to(this.camera, { zoom: 1.0, duration: 1.6, onUpdate: () => this.camera.updateProjectionMatrix() });
    }
  }

  public zoomIn(): void {
    gsap.to(this.camera, {
      zoom: Math.min(3.0, this.camera.zoom * 1.25),
      duration: 0.35,
      onUpdate: () => this.camera.updateProjectionMatrix()
    });
  }

  public zoomOut(): void {
    gsap.to(this.camera, {
      zoom: Math.max(0.6, this.camera.zoom / 1.25),
      duration: 0.35,
      onUpdate: () => this.camera.updateProjectionMatrix()
    });
  }

  public handleResize(): void {
    if (this.isDestroyed) return;
    if (!this.wrapper || !this.renderer || !this.camera) return;
    const width = this.wrapper.clientWidth;
    const height = this.wrapper.clientHeight;
    if (width > 0 && height > 0) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }

  private isStandMatchingFilters(stand: StandData): boolean {
    if (stand.isPOI) {
      if (!this.activeSearchQuery) return true;
      const q = this.activeSearchQuery.toLowerCase();
      return stand.name.toLowerCase().includes(q) || (stand.desc || '').toLowerCase().includes(q);
    }

    // 1. Filtro por Estado Comercial
    const statusFilter = (this.activeStatusFilter || 'all').toLowerCase();
    const standStatus = (stand.status || 'disponible').toLowerCase();
    if (statusFilter !== 'all' && standStatus !== statusFilter) {
      return false;
    }

    // 2. Filtro por Categoría / Rubro (idéntico a Expositores)
    const category = (this.activeRubroFilter || 'all').toLowerCase();
    if (category !== 'all') {
      const cleanId = (stand.id || '').toUpperCase().trim();
      const company = (stand.company || '').toLowerCase();
      const rubro = (stand.rubro || '').toLowerCase();
      const sectorName = (stand.sectorName || '').toLowerCase();
      const expCategory = (stand.expositor?.category || '').toLowerCase();

      let matchCategory = false;
      if (expCategory === category) {
        matchCategory = true;
      } else if (category === 'mineria') {
        matchCategory = cleanId.startsWith('A') || rubro.includes('miner') || sectorName.includes('miner') || company.includes('litio') || company.includes('miner');
      } else if (category === 'agro') {
        matchCategory = cleanId.startsWith('B') || rubro.includes('agro') || sectorName.includes('agro') || company.includes('agro');
      } else if (category === 'energia') {
        matchCategory = cleanId.startsWith('E') || rubro.includes('energ') || sectorName.includes('energ') || company.includes('solar') || company.includes('energ');
      } else if (category === 'tecnologia') {
        matchCategory = cleanId.startsWith('D') || rubro.includes('tecno') || sectorName.includes('tecno') || company.includes('3d') || company.includes('tech') || company.includes('ia');
      } else if (category === 'logistica') {
        matchCategory = cleanId.startsWith('H') || cleanId.startsWith('G') || cleanId.startsWith('MAQ') || cleanId.startsWith('CORP') || rubro.includes('maquinaria') || rubro.includes('logistic') || rubro.includes('puerto');
      } else {
        matchCategory = rubro.includes(category) || sectorName.includes(category) || company.includes(category);
      }

      if (!matchCategory) return false;
    }

    // 3. Filtro por Búsqueda de texto
    const q = (this.activeSearchQuery || '').toLowerCase().trim();
    if (q) {
      const matchSearch = !!(
        stand.id.toLowerCase().includes(q) ||
        (stand.company && stand.company.toLowerCase().includes(q)) ||
        (stand.rubro && stand.rubro.toLowerCase().includes(q)) ||
        (stand.sectorName && stand.sectorName.toLowerCase().includes(q))
      );
      if (!matchSearch) return false;
    }

    return true;
  }

  /**
   * Actualiza la visibilidad de los stands en 3D combinando todos los filtros activos.
   */
  public updateStandVisibilities(): void {
    let firstMatch: StandData | null = null;

    Object.values(this.standMeshesMap).forEach(m => {
      const match = this.isStandMatchingFilters(m.data);
      m.group.visible = match;
      m.hitBox.visible = match;

      if (match && !firstMatch && !m.data.isPOI) firstMatch = m.data;
    });

    if (this.currentSelectedStand && !this.isStandMatchingFilters(this.currentSelectedStand)) {
      if (firstMatch) {
        this.selectStand(firstMatch, true);
      } else if (this.highlightBox) {
        this.highlightBox.visible = false;
        if (this.pinElement) this.pinElement.classList.remove('visible');
      }
    } else if (!this.currentSelectedStand && firstMatch) {
      this.selectStand(firstMatch, true);
    }
  }

  public applyStatusFilter(status: CommercialStatus | 'all'): void {
    this.activeStatusFilter = status;
    this.updateStandVisibilities();
  }

  public applyFilter(rubro: string): void {
    this.activeRubroFilter = rubro;
    this.updateStandVisibilities();
  }

  public applySearch(query: string): void {
    this.activeSearchQuery = query;
    this.updateStandVisibilities();
  }

  private updateFloatingPin(): void {
    if (!this.currentSelectedStand || !this.pinElement || !this.wrapper) return;

    this.tempVec.set(
      this.currentSelectedStand.x,
      (this.currentSelectedStand.y || 0) + 3.8,
      this.currentSelectedStand.z
    );
    this.tempVec.project(this.camera);

    if (this.tempVec.z > 1 || this.tempVec.z < -1) {
      this.pinElement.classList.remove('visible');
      return;
    }

    const rect = this.wrapper.getBoundingClientRect();
    const screenX = (this.tempVec.x * 0.5 + 0.5) * rect.width;
    const screenY = (-(this.tempVec.y * 0.5) + 0.5) * rect.height;

    this.pinElement.style.transform = `translate(${screenX}px, ${screenY}px) translate(-50%, -100%)`;
    this.pinElement.classList.add('visible');
  }

  private isLoopPaused = false;

  /** Registra una textura creada por código para liberarla en `destroy()`. */
  private trackTexture<T extends THREE.Texture>(texture: T): T {
    this.canvasTextures.add(texture);
    return texture;
  }

  public pauseLoop(): void {
    this.isLoopPaused = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
  }

  public resumeLoop(): void {
    if (this.isDestroyed || !this.isLoopPaused) return;
    this.isLoopPaused = false;
    this.ngZone.runOutsideAngular(() => this.renderLoop());
  }

  private renderLoop(): void {
    if (this.isLoopPaused || this.isDestroyed) return;
    this.animationFrameId = requestAnimationFrame(() => this.renderLoop());

    this.controls.update();
    this.updateFloatingPin();

    const elapsed = this.clock.getElapsedTime();
    this.animatedBanners.forEach(item => {
      item.mesh.position.y = item.baseHeight + Math.sin(elapsed * item.speed) * 0.14;
      item.mesh.quaternion.copy(this.camera.quaternion);
    });

    this.renderer.render(this.scene, this.camera);
  }


  public destroy(): void {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    // 1. Detener el bucle de render.
    this.isLoopPaused = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }

    // 2. Desregistrar listeners de window / canvas.
    window.removeEventListener('resize', this.resizeHandler);
    if (this.canvas) {
      this.canvas.removeEventListener('wheel', this.wheelHandler);
      if (this.pointerDownHandler) {
        this.canvas.removeEventListener('pointerdown', this.pointerDownHandler);
        this.pointerDownHandler = undefined as unknown as (e: PointerEvent) => void;
      }
    }

    // 3. Detener los tweens de GSAP que escriben sobre camara y materiales.
    if (this.camera) {
      gsap.killTweensOf(this.camera);
      gsap.killTweensOf(this.camera.position);
    }
    if (this.controls) {
      gsap.killTweensOf(this.controls);
      gsap.killTweensOf(this.controls.target);
    }
    if (this.roofMat) {
      gsap.killTweensOf(this.roofMat);
    }

    // 4. Recorrer la escena liberando TODOS los recursos, no solo mallas.
    //    `isMesh` dejaba fuera LineSegments (el highlight), Line y Points.
    const disposedTextures = new Set<THREE.Texture>();
    const disposedMaterials = new Set<THREE.Material>();
    const disposedGeometries = new Set<THREE.BufferGeometry>();

    const disposeMaterial = (material: THREE.Material): void => {
      if (!material || disposedMaterials.has(material)) return;
      disposedMaterials.add(material);

      // Los mapas de un material no se liberan con material.dispose().
      for (const key of Object.keys(material)) {
        const value = (material as unknown as Record<string, unknown>)[key];
        if (value instanceof THREE.Texture) {
          if (!disposedTextures.has(value)) {
            disposedTextures.add(value);
            value.dispose();
          }
        }
      }
      material.dispose();
    };

    if (this.scene) {
      this.scene.traverse((obj) => {
        const anyObj = obj as THREE.Mesh & {
          geometry?: THREE.BufferGeometry;
          material?: THREE.Material | THREE.Material[];
        };

        if (anyObj.geometry && !disposedGeometries.has(anyObj.geometry)) {
          disposedGeometries.add(anyObj.geometry);
          anyObj.geometry.dispose();
        }

        if (anyObj.material) {
          if (Array.isArray(anyObj.material)) {
            anyObj.material.forEach(disposeMaterial);
          } else {
            disposeMaterial(anyObj.material);
          }
        }
      });
    }

    // 5. Texturas de canvas registradas (4 CanvasTexture).
    this.canvasTextures.forEach((texture) => {
      if (!disposedTextures.has(texture)) {
        disposedTextures.add(texture);
        texture.dispose();
      }
    });
    this.canvasTextures.clear();

    // 6. Materiales compartidos / flyweight.
    this.sharedMaterials.forEach((material) => {
      if (!disposedMaterials.has(material)) {
        disposedMaterials.add(material);
        material.dispose();
      }
    });
    this.sharedMaterials.clear();
    this.carpetMaterialsCache.forEach((material) => {
      if (!disposedMaterials.has(material)) {
        disposedMaterials.add(material);
        material.dispose();
      }
    });
    this.carpetMaterialsCache.clear();

    // 7. Render target de sombras de la luz direccional.
    if (this.sunLight) {
      if (this.sunLight.shadow) {
        this.sunLight.shadow.map?.dispose();
        this.sunLight.shadow.map = null;
      }
      this.sunLight.dispose();
    }

    // 8. Vaciar standsGroup y colecciones internas
    if (this.standsGroup) {
      while (this.standsGroup.children.length > 0) {
        const child = this.standsGroup.children[0];
        this.standsGroup.remove(child);
      }
      if (this.scene) {
        this.scene.remove(this.standsGroup);
      }
    }
    // 8. Vaciar las colecciones internas: retenian mallas ya liberadas.
    this.pickableStands = [];
    this.animatedBanners = [];
    this.standMeshesMap = {};
    this.highlightBox = undefined as unknown as THREE.LineSegments;
    this.currentSelectedStand = null;
    this.roofGroup = undefined as unknown as THREE.Group;
    this.roofMat = undefined as unknown as THREE.MeshStandardMaterial;

    // 9. Liberar el renderer y el contexto WebGL.
    if (this.controls) {
      this.controls.dispose();
    }
    if (this.renderer) {
      this.renderer.renderLists.dispose();
      this.renderer.dispose();
      // Libera el contexto GPU de forma definitiva.
      this.renderer.forceContextLoss();
    }
    if (this.scene) {
      this.scene.clear();
    }

    // 10. Soltar referencias a nodos del DOM.
    this.canvas = undefined as unknown as HTMLCanvasElement;
    this.wrapper = undefined as unknown as HTMLElement;
    this.pinElement = undefined as unknown as HTMLElement;
    this.pinTextElement = undefined as unknown as HTMLElement;
  }
}

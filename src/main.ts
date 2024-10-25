/**
 * @file main.ts
 * @author Chahan
 * @author Quentin
 * @description Main file for the game
 */

import {
	PerspectiveCamera,
	Scene,
	SRGBColorSpace,
	TextureLoader,
	WebGLRenderer
} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Pane} from 'tweakpane'

import {PieceCodes} from './ListPiece.ts';
import {Solver} from './Solver.ts';
import {Board} from './Board.ts';
import {Statistics} from './Statistics.ts';

const easeOutQuad = (t: number, b: number, c: number, d: number) => {
	const e = t / d;
	return -c * e * (e - 2) + b;
}

interface CameraAnimationFrame {
	camX: number;
	camZ: number;
	sceneX: number;
	sceneZ: number;
}

// Camera animation configurations
const CAMERA_ANIMATION_CONFIG: {
	[key: string]: CameraAnimationFrame
} = {
	"1": {camX: 1, camZ: 1, sceneX: 0, sceneZ: 0},
	"2": {camX: -1, camZ: -0.335, sceneX: -5.5, sceneZ: -2},
	"3": {camX: 0, camZ: 0.665, sceneX: -5.5, sceneZ: -2},
	"4": {camX: 1, camZ: 0.335, sceneX: 5, sceneZ: 2}
};

class CameraController {
	game: Game;
	frames: number;
	duration: number;

	constructor(game: Game) {
		this.game = game;
		this.frames = 0;
		this.duration = 100;
	}

	/**
	 * Switches the camera
	 */
	switchCamera() {
		if (this.game.requestCameraSwitch) return;
		this.game.requestCameraSwitch = true;
	}

	/**
	 * Updates the camera animation
	 */
	updateAnimation() {
		const {activeCamera} = this.game;
		let from: CameraAnimationFrame;
		let to: CameraAnimationFrame;

		if (activeCamera === this.game.camera) {
			from = CAMERA_ANIMATION_CONFIG["1"];
			to = CAMERA_ANIMATION_CONFIG["2"];
		} else {
			from = CAMERA_ANIMATION_CONFIG["3"];
			to = CAMERA_ANIMATION_CONFIG["4"];
		}

		const t = this.frames;
		const d = this.duration;

		this.game.camera2.position.x = easeOutQuad(t, from.camX, to.camX, d);
		this.game.camera2.position.z = easeOutQuad(t, from.camZ, to.camZ, d);

		this.game.scene1.position.x = easeOutQuad(t, from.sceneX, to.sceneX, d);
		this.game.scene1.position.z = easeOutQuad(t, from.sceneZ, to.sceneZ, d);

		this.frames++;

		if (this.frames >= this.duration) {
			this.completeSwitch();
		}
	}

	/**
	 * Completes the camera switch
	 */
	completeSwitch() {
		this.game.requestCameraSwitch = false;
		this.frames = 0;

		const {activeCamera, camera, camera2, controls, controls2} = this.game;

		if (activeCamera === camera) {
			controls.enabled = false;
			controls2.enabled = true;
			this.game.activeCamera = camera2;
		} else {
			controls.enabled = true;
			controls2.enabled = false;
			this.game.activeCamera = camera;
		}
	}
}

class GUIController {
	game: Game;
	pane: Pane;

	constructor(game: Game) {
		this.game = game;
		this.pane = new Pane(); // Initialize tweakpane
		this.setupFolders();
	}

	/**
	 * Sets up the GUI folders
	 */
	setupFolders() {
		this.setupCommandFolder();
		this.setupSpeedFolder();
		this.setupStatsFolder();
		this.setupMiniBoardFolder();
	}

	/**
	 * Sets up the command folder in the GUI
	 */
	setupCommandFolder() {
		const commandFolder = this.pane.addFolder({
			title: 'Controls'
		});

		// RunSolver Button
		commandFolder.addButton({
			title: 'Run Solver'
		}).on('click', () => {
			this.game.solver.stop = false;
			this.game.stats.start();
		});

		// StopSolver Button
		commandFolder.addButton({
			title: 'Stop Solver'
		}).on('click', () => {
			this.game.solver.stop = true;
			this.game.stats.stop();
		});

		// Check Button
		commandFolder.addButton({
			title: 'Check'
		}).on('click', () => {
			if (this.game.checkIntervalID) {
				clearInterval(this.game.checkIntervalID);
				this.game.checkIntervalID = undefined;
			} else {
				this.game.checkIntervalID = setInterval(() => {
					this.game.board.checkIntegrity();
					this.game.stats.miniBoard.checkIntegrity();
				}, 1000);
			}
		});

		// SwitchCamera Button
		commandFolder.addButton({
			title: 'Switch Camera'
		}).on('click', () => {
			this.game.cameraController.switchCamera();
		});

		commandFolder.expanded = true; // Open the folder by default
	}

	/**
	 * Sets up the speed folder in the GUI
	 */
	setupSpeedFolder() {
		const speedFolder = this.pane.addFolder({
			title: 'Speed'
		});

		// Iterations/Frame Slider
		speedFolder.addBinding(this.game, 'iterationPerFrame', {
			label: 'Iterations / Frame',
			min: 1,
			max: 5000,
			step: 1
		}).on('change', (value) => {
			this.game.iterationPerFrame = value.value;
		});

		speedFolder.expanded = true;
	}

	/**
	 * Sets up the stats folder in the GUI
	 */
	setupStatsFolder() {
		const statsFolder = this.pane.addFolder({
			title: 'Stats'
		});

		// Moves Per Second Display
		statsFolder.addBinding(this.game.stats, 'moves_per_sec', {
			label: 'Moves Per Second',
			readonly: true
		});

		statsFolder.addBinding(this.game.stats, 'fps_display', {
			label: 'FPS',
			readonly: true
		})

		// Elapsed Time Display
		statsFolder.addBinding(this.game.stats, 'elapsed_time', {
			label: 'Elapsed Time',
			readonly: true
		});

		// Number of Pieces Display
		statsFolder.addBinding(this.game.stats, 'number_of_pieces', {
			label: 'Number of Pieces',
			readonly: true
		});

		statsFolder.expanded = true;
	}

	/**
	 * Sets up the mini board folder in the GUI
	 */
	setupMiniBoardFolder() {
		const miniBoardFolder = this.pane.addFolder({
			title: 'Best Solution'
		});

		// Best Solution Display
		miniBoardFolder.addBinding(this.game.stats, 'best_solution', {
			label: 'Best Solution',
			readonly: true
		});

		miniBoardFolder.expanded = true;
	}
}

export class Game {
	iterationPerFrame: number;
	requestCameraSwitch: boolean;
	scene1: Scene;
	scene2: Scene;
	renderer: WebGLRenderer;
	camera: PerspectiveCamera;
	camera2: PerspectiveCamera;
	activeCamera: PerspectiveCamera;
	controls: OrbitControls;
	controls2: OrbitControls;
	board: Board;
	solver: Solver;
	stats: Statistics;
	guiController: GUIController;
	cameraController: CameraController;
	checkIntervalID?: number;

	constructor() {
		// Iteration settings
		this.iterationPerFrame = 1;
		this.requestCameraSwitch = false;

		this.scene1 = new Scene();
		this.scene1.position.x = 0;

		this.scene2 = new Scene();
		this.scene2.name = "scene2";

		this.renderer = new WebGLRenderer();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.autoClear = false;

		this.camera = new PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);
		this.camera2 = new PerspectiveCamera(
			75,
			window.innerWidth / window.innerHeight,
			0.1,
			1000
		);
		this.activeCamera = this.camera;

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls2 = new OrbitControls(this.camera2, this.renderer.domElement);
		this.controls2.enabled = false;

		this.camera.position.set(0, 0, 5);
		this.camera2.position.set(1, 0, 1);

		// Initialize background
		const loader = new TextureLoader();
		const backgroundTexture = loader.load("/Eternity-II-ThreeJS/George-peabody-library.jpg");
		backgroundTexture.colorSpace = SRGBColorSpace;
		backgroundTexture.wrapS = backgroundTexture.wrapT = 1000;
		backgroundTexture.repeat.set(1, 1);
		this.scene1.background = backgroundTexture;

		// Initialize board and solver
		const placedPieces = Array(255).fill(null);
		this.board = new Board(this, this.scene1, placedPieces);
		this.solver = new Solver(this);
		this.solver.initDict(PieceCodes);
		this.solver.initStack(this.board);

		// Initialize statistics
		this.stats = new Statistics(this);

		// GUI and Camera Controller
		this.guiController = new GUIController(this);
		this.cameraController = new CameraController(this);

		// Bind methods
		this.animate = this.animate.bind(this);
		this.onResize = this.onResize.bind(this);

		// Setup event listeners
		window.addEventListener('resize', this.onResize, false);

		// Append renderer to the document
		document.body.appendChild(this.renderer.domElement);

		this.checkIntervalID = undefined;
	}

	/**
	 * Initializes the game
	 */
	init() {
		this.onResize(); // Initial resize
	}

	/**
	 * Main animation loop
	 */
	animate() {
		requestAnimationFrame(this.animate);

		if (!this.solver.stop) {
			for (let i = 0; i < this.iterationPerFrame; i++) {
				this.solver.solve(this.board);
			}
		}

		if (this.requestCameraSwitch) {
			this.controls.enabled = false;
			this.controls2.enabled = false;
			this.cameraController.updateAnimation();
		}

		this.controls.update();

		this.renderer.clear();
		this.renderer.render(this.scene1, this.camera);
		this.renderer.clearDepth();
		this.renderer.render(this.scene2, this.camera2);

		// Increment frame count for statistics
		this.stats.incrementFrame();
	}

	/**
	 * Handles window resize events
	 */
	onResize() {
		const width = window.innerWidth;
		const height = window.innerHeight;

		// Update renderer size
		this.renderer.setSize(width, height);

		// Update camera aspect ratio
		this.camera.aspect = width / height;
		this.camera.updateProjectionMatrix();
		this.camera2.aspect = width / height;
		this.camera2.updateProjectionMatrix();
	}

	/**
	 * Starts the game
	 */
	start() {
		this.init();
		this.solver.shuffle();
		this.solver.placeCenterPiece(this.board);
		this.animate();
	}
}

// Initialize and start the game
const game = new Game();
game.start();

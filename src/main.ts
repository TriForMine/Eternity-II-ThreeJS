// main.ts

import {
	PerspectiveCamera,
	Scene,
	SRGBColorSpace,
	TextureLoader,
	WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { PieceCodes } from './ListPiece';
import type { SolverResponse } from './SolverWorker';
import SolverWorker from './SolverWorker?worker';
import { Board, type BoardState } from './Board';
import { Statistics } from './Statistics';
import TextureManager from './TextureManager';
import I18n from './i18n';

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
	[key: string]: CameraAnimationFrame;
} = {
	'1': { camX: 1, camZ: 1, sceneX: 0, sceneZ: 0 },
	'2': { camX: -1, camZ: -0.335, sceneX: -5.5, sceneZ: -2 },
	'3': { camX: 0, camZ: 0.665, sceneX: -5.5, sceneZ: -2 },
	'4': { camX: 1, camZ: 0.335, sceneX: 5, sceneZ: 2 },
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
		const { activeCamera } = this.game;
		let from: CameraAnimationFrame;
		let to: CameraAnimationFrame;

		if (activeCamera === this.game.camera) {
			from = CAMERA_ANIMATION_CONFIG['1'];
			to = CAMERA_ANIMATION_CONFIG['2'];
		} else {
			from = CAMERA_ANIMATION_CONFIG['3'];
			to = CAMERA_ANIMATION_CONFIG['4'];
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

		const { activeCamera, camera, camera2, controls, controls2 } = this.game;

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

export class Game {
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
	stats: Statistics;
	cameraController: CameraController;
	solverWorker = new SolverWorker();
	lastTime: number;
	i18n: I18n;
	isStepByStepMode: boolean;

	constructor() {
		this.requestCameraSwitch = false;

		this.scene1 = new Scene();
		this.scene1.position.x = 0;

		this.scene2 = new Scene();
		this.scene2.name = 'scene2';

		const canvas = document.getElementById('canvas') as HTMLCanvasElement;

		this.renderer = new WebGLRenderer({
			canvas: canvas,
			antialias: true,
		});

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
		const backgroundTexture = loader.load('/Eternity-II-ThreeJS/George-peabody-library.jpg');
		backgroundTexture.colorSpace = SRGBColorSpace;
		backgroundTexture.wrapS = backgroundTexture.wrapT = 1000;
		backgroundTexture.repeat.set(1, 1);
		this.scene1.background = backgroundTexture;

		// Initialize board and solver
		const placedPieces = Array(255).fill(null);
		this.board = new Board(this, this.scene1, placedPieces);

		// Initialize statistics
		this.stats = new Statistics(this);

		// Camera Controller
		this.cameraController = new CameraController(this);

		// Initialize i18n
		this.i18n = new I18n();
		const savedLang = localStorage.getItem('language') || window.navigator.language.slice(0, 2) || 'en';
		this.i18n.loadTranslations(savedLang);

		// Set the language select value
		const languageSelect = document.getElementById('languageSelect') as HTMLSelectElement;
		if (languageSelect) {
			languageSelect.value = savedLang;
		}

		// Initialize step-by-step mode
		this.isStepByStepMode = false;

		// Bind methods
		this.animate = this.animate.bind(this);
		this.onResize = this.onResize.bind(this);
		this.onStart = this.onStart.bind(this);
		this.onPause = this.onPause.bind(this);
		this.onSwitchCamera = this.onSwitchCamera.bind(this);
		this.onReset = this.onReset.bind(this);
		this.updateStatsUI = this.updateStatsUI.bind(this);
		this.onLanguageChange = this.onLanguageChange.bind(this);
		this.openInfoModal = this.openInfoModal.bind(this);
		this.closeInfoModal = this.closeInfoModal.bind(this);
		this.onNextStep = this.onNextStep.bind(this);
		this.onToggleStepByStep = this.onToggleStepByStep.bind(this);

		// Setup event listeners
		window.addEventListener('resize', this.onResize, false);

		// Button Event Listeners
		const startButton = document.getElementById('start');
		const stopButton = document.getElementById('stop');
		const resetButton = document.getElementById('reset');
		const switchCameraButton = document.getElementById('switchCamera');
		const nextStepButton = document.getElementById('nextStep');
		const toggleStepByStepCheckbox = document.getElementById('toggleStepByStep') as HTMLInputElement;

		if (startButton) startButton.addEventListener('click', this.onStart.bind(this));
		if (stopButton) stopButton.addEventListener('click', this.onPause.bind(this));
		if (switchCameraButton) switchCameraButton.addEventListener('click', this.onSwitchCamera.bind(this));
		if (resetButton) resetButton.addEventListener('click', this.onReset.bind(this));
		if (nextStepButton) nextStepButton.addEventListener('click', this.onNextStep.bind(this));
		if (toggleStepByStepCheckbox) toggleStepByStepCheckbox.addEventListener('change', this.onToggleStepByStep.bind(this));

		if (languageSelect) languageSelect.addEventListener('change', this.onLanguageChange);

		// Modal Event Listeners
		const openInfoModalButton = document.getElementById('openInfoModal');
		const closeInfoModalButton = document.getElementById('closeInfoModal');
		const closeInfoModalFooterButton = document.getElementById('closeInfoModalFooter');

		if (openInfoModalButton) openInfoModalButton.addEventListener('click', this.openInfoModal);
		if (closeInfoModalButton) closeInfoModalButton.addEventListener('click', this.closeInfoModal);
		if (closeInfoModalFooterButton) closeInfoModalFooterButton.addEventListener('click', this.closeInfoModal);

		this.solverWorker.onmessage = this.onSolverMessage.bind(this);
		this.lastTime = Date.now();

		// Update stats UI periodically
		setInterval(this.updateStatsUI, 1000 / 60); // 60 FPS
	}

	/**
	 * Handles language change event.
	 */
	async onLanguageChange(event: Event) {
		const select = event.target as HTMLSelectElement;
		const selectedLang = select.value;
		await this.i18n.loadTranslations(selectedLang);
		localStorage.setItem('language', selectedLang);
	}

	/**
	 * Opens the information modal.
	 */
	openInfoModal() {
		const infoModal = document.getElementById('infoModal');
		if (infoModal) {
			infoModal.classList.remove('hidden');
		}
	}

	/**
	 * Closes the information modal.
	 */
	closeInfoModal() {
		const infoModal = document.getElementById('infoModal');
		if (infoModal) {
			infoModal.classList.add('hidden');
		}
	}

	/**
	 * Initializes the game
	 */
	init() {
		this.onResize(); // Initial resize
	}

	/**
	 * Handles messages received from the solver worker.
	 */
	onSolverMessage(event: MessageEvent<SolverResponse>) {
		const message = event.data;
		switch (message.type) {
			case 'update':
			case 'finished': {
				const { boardState, numMoves, lastPlacedCase } = message.data;
				const dataArray = new Uint8Array(boardState);
				const numPieces = dataArray.length / 3;
				const boardStateArray: BoardState = [];

				for (let i = 0; i < numPieces; i++) {
					const index = i * 3;
					const spot = dataArray[index];
					const pieceIndex = dataArray[index + 1];
					const rotation = dataArray[index + 2];
					const name = PieceCodes[pieceIndex];

					boardStateArray.push({
						spot,
						name,
						rotation,
					});
				}

				this.lastTime = Date.now();

				// Update statistics
				this.stats.numMoves += numMoves;
				this.stats.lastPlacedCase = lastPlacedCase;

				// Update the board with new state
				this.updateBoard(boardStateArray);

				if (message.type === 'finished') {
					this.pauseSolver();
				}
				break;
			}
		}
	}

	/**
	 * Updates the board based on data received from the solver worker.
	 */
	updateBoard(boardState: BoardState) {
		this.board.updateFromState(boardState);
	}

	/**
	 * Starts the solver by sending a message to the worker.
	 */
	startSolver() {
		if (this.isStepByStepMode) {
			// In step-by-step mode, do not start continuous solving
		} else {
			this.solverWorker.postMessage({ type: 'solve' });
		}
	}

	/**
	 * Pause the solver by sending a message to the worker.
	 */
	pauseSolver() {
		this.solverWorker.postMessage({ type: 'pause' });
	}

	/**
	 * Resets the solver by sending a message to the worker.
	 */
	resetSolver() {
		this.solverWorker.postMessage({ type: 'reset' });
	}

	/**
	 * Switches the camera view.
	 */
	switchCamera() {
		this.cameraController.switchCamera();
	}

	/**
	 * Button Handlers
	 */
	onStart() {
		this.startSolver();
		this.stats.start();

		// Disable the start button
		const startButton = document.getElementById('start') as HTMLButtonElement;
		if (startButton) {
			startButton.disabled = true;
			startButton.classList.add('disabled');
		}

		// Enable the stop button
		const stopButton = document.getElementById('stop') as HTMLButtonElement;
		if (stopButton) {
			stopButton.disabled = false;
			stopButton.classList.remove('disabled');
		}

		// Enable the reset button
		const resetButton: HTMLButtonElement | undefined = document.getElementById('reset') as HTMLButtonElement;
		if (resetButton) {
			resetButton.disabled = false;
			resetButton.classList.remove('disabled');
		}
	}

	onPause() {
		this.pauseSolver();
		this.stats.resetMovesPerSecSamples();
		this.stats.stop();

		// Enable the start button
		const startButton = document.getElementById('start') as HTMLButtonElement;
		if (startButton) {
			startButton.disabled = false;
			startButton.classList.remove('disabled');
		}

		// Disable the stop button
		const stopButton = document.getElementById('stop') as HTMLButtonElement;
		if (stopButton) {
			stopButton.disabled = true;
			stopButton.classList.remove('disabled');
		}
	}

	onReset() {
		this.resetSolver();
		this.stats.resetMovesPerSecSamples();
		this.stats.reset();

		// Disable the reset button
		const resetButton = document.getElementById('reset') as HTMLButtonElement;
		if (resetButton) {
			resetButton.disabled = true;
			resetButton.classList.add('disabled');
		}

		// Enable the start button
		const startButton = document.getElementById('start') as HTMLButtonElement;
		if (startButton) {
			startButton.disabled = false;
			startButton.classList.remove('disabled');
		}

		// Disable the stop button
		const stopButton = document.getElementById('stop') as HTMLButtonElement;
		if (stopButton) {
			stopButton.disabled = true;
			stopButton.classList.remove('disabled');
		}
	}

	onSwitchCamera() {
		this.switchCamera();
		const switchCameraButton = document.getElementById('switchCameraText');
		if (switchCameraButton) {
			switchCameraButton.setAttribute('data-i18n', this.activeCamera === this.camera ? 'camera1' : 'camera2');
			if (this.activeCamera === this.camera) {
				switchCameraButton.textContent = this.i18n.t('camera1')
			} else {
				switchCameraButton.textContent = this.i18n.t('camera2');
			}
		}
	}

	/**
	 * Handles the "Next Step" button click.
	 */
	onNextStep() {
		if (this.isStepByStepMode) {
			this.solverWorker.postMessage({ type: 'nextStep' });
		}
	}

	/**
	 * Toggles the step-by-step mode.
	 */
	onToggleStepByStep(event: Event) {
		const checkbox = event.target as HTMLInputElement;
		this.isStepByStepMode = checkbox.checked;
		const nextStepButton = document.getElementById('nextStep') as HTMLButtonElement;
		const startButton = document.getElementById('start') as HTMLButtonElement;
		const stopButton = document.getElementById('stop') as HTMLButtonElement;
		const resetButton = document.getElementById('reset') as HTMLButtonElement;

		if (this.isStepByStepMode) {
			this.onPause();
			// Show Next Step button
			if (nextStepButton) nextStepButton.style.display = '';
			// Hide Start, Pause, and Reset buttons
			if (startButton) startButton.style.display = 'none';
			if (stopButton) stopButton.style.display = 'none';
			if (resetButton) resetButton.style.display = 'none';
		} else {
			// Hide Next Step button
			if (nextStepButton) nextStepButton.style.display = 'none';
			// Show Start, Pause, and Reset buttons
			if (startButton) startButton.style.display = '';
			if (stopButton) stopButton.style.display = '';
			if (resetButton) resetButton.style.display = '';
		}
	}

	/**
	 * Updates the statistics in the UI.
	 */
	updateStatsUI() {
		const movesPerSecondElem = document.getElementById('movesPerSecond');
		const fpsElem = document.getElementById('fps');
		const elapsedTimeElem = document.getElementById('elapsedTime');
		const numberOfPiecesElem = document.getElementById('numberOfPieces');
		const totalMovesElem = document.getElementById('totalMoves');
		const bestSolutionElem = document.getElementById('bestSolution');

		if (movesPerSecondElem) movesPerSecondElem.textContent = this.stats.moves_per_sec;
		if (fpsElem) fpsElem.textContent = this.stats.fps_display;
		if (elapsedTimeElem) elapsedTimeElem.textContent = this.stats.elapsed_time;
		if (numberOfPiecesElem) numberOfPiecesElem.textContent = this.stats.number_of_pieces.toString();
		if (totalMovesElem) totalMovesElem.textContent = this.stats.totalNumMoves.toLocaleString();
		if (bestSolutionElem) bestSolutionElem.textContent = this.stats.best_solution || 'N/A';
	}

	/**
	 * Main animation loop
	 */
	animate() {
		requestAnimationFrame(this.animate);

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
		this.solverWorker.postMessage({
			type: 'init',
			data: {
				pieceCodes: PieceCodes,
			},
		});
		this.animate();
	}
}

const game = new Game();

document.addEventListener('DOMContentLoaded', () => {
	// Toggle Controls Visibility on Mobile
	const toggleButton = document.getElementById('toggleControls');
	const controls = document.getElementById('controls');
	const hideControlsButton = document.getElementById('hideControls');

	if (toggleButton && controls && hideControlsButton) {
		toggleButton.addEventListener('click', () => {
			controls.classList.toggle('hidden');
		});

		hideControlsButton.addEventListener('click', () => {
			controls.classList.add('hidden');
		});
	}

	TextureManager.getInstance().loadTextures(PieceCodes);
	game.start();
});

window.addEventListener('beforeunload', () => {
	// Stop the solver worker
	game.resetSolver();

	// Close the worker
	game.solverWorker.terminate();
});

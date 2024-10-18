/**
 * @file index.js
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
import {GUI} from 'dat.gui';

import {PieceCodes} from './ListPiece.js';
import {Solver} from './Solver.js';
import {Board} from './Board.js';
import {Statistics} from './Statistics.js';

/**
 * Easing function for animations
 * @param {number} t - Current time
 * @param {number} b - Start value
 * @param {number} c - Change in value
 * @param {number} d - Duration
 * @returns {number} - The calculated value
 */
const easeOutQuad = (t, b, c, d) => {
    const e = t / d;
    return -c * e * (e / 2) + b;
}

// Camera animation configurations
const CAMERA_ANIMATION_CONFIG = {
    "1": {camX: 1, camZ: 1, sceneX: 0, sceneZ: 0},
    "2": {camX: -1, camZ: -0.335, sceneX: -5.5, sceneZ: -2},
    "3": {camX: 0, camZ: 0.665, sceneX: -5.5, sceneZ: -2},
    "4": {camX: 1, camZ: 0.335, sceneX: 5, sceneZ: 2}
};

/**
 * Class to handle camera switching and animations
 */
class CameraController {
    /**
     * @param {Game} game - The game instance
     */
    constructor(game) {
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
        let from;
        let to;

        if (activeCamera === this.game.camera) {
            from = CAMERA_ANIMATION_CONFIG["1"];
            to = CAMERA_ANIMATION_CONFIG["2"];
        } else if (activeCamera === this.game.camera2) {
            from = CAMERA_ANIMATION_CONFIG["3"];
            to = CAMERA_ANIMATION_CONFIG["4"];
        } else {
            return;
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

/**
 * Class to handle GUI setup and interactions
 */
class GUIController {
    /**
     * @param {Game} game - The game instance
     */
    constructor(game) {
        this.game = game;
        this.gui = new GUI();
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
        const commandFolder = this.gui.addFolder("Controls");

        const runCommand = {
            RunSolver: () => {
                this.game.solver.stop = false;
                this.game.stats.start();
            }
        };

        const stopCommand = {
            StopSolver: () => {
                this.game.solver.stop = true;
                clearInterval(this.game.intervalID);
                this.game.intervalID = null;
            }
        };

        const checkCommand = {
            Check: () => {
                if (this.game.checkIntervalID) {
                    clearInterval(this.game.checkIntervalID);
                    this.game.checkIntervalID = null;
                } else {
                    this.game.checkIntervalID = setInterval(() => {
                        this.game.board.checkIntegrity();
                        this.game.stats.miniBoard.checkIntegrity();
                    }, 1000);
                }
            }
        };

        const switchCameraCommand = {
            SwitchCamera: () => this.game.cameraController.switchCamera()
        };

        commandFolder.add(runCommand, "RunSolver");
        commandFolder.add(stopCommand, "StopSolver");
        commandFolder.add(checkCommand, "Check");
        commandFolder.add(switchCameraCommand, "SwitchCamera");
        commandFolder.open();
    }

    /**
     * Sets up the speed folder in the GUI
     */
    setupSpeedFolder() {
        const speedFolder = this.gui.addFolder("Speed");

        speedFolder
            .add(this.game, "iterationPerFrame", 1, 5000)
            .step(1)
            .name("Iterations/Frame")
            .onChange(value => {
                this.game.iterationPerFrame = value;
            });

        speedFolder.open();
    }

    /**
     * Sets up the stats folder in the GUI
     */
    setupStatsFolder() {
        const statsFolder = this.gui.addFolder("Stats");

        statsFolder
            .add(this.game.stats, "moves_per_sec")
            .name("Moves/Sec")
            .listen()
            .onChange(() => this.game.stats.updateDisplay());

        statsFolder
            .add(this.game.stats, "elapsed_time")
            .name("Elapsed Time")
            .listen()
            .onChange(() => this.game.stats.updateDisplay());

        statsFolder
            .add(this.game.stats, "number_of_pieces")
            .name("Number of Pieces")
            .listen()
            .onChange(() => this.game.stats.updateDisplay());

        statsFolder.open();
    }

    /**
     * Sets up the mini board folder in the GUI
     */
    setupMiniBoardFolder() {
        const miniBoardFolder = this.gui.addFolder("Best Solution");

        miniBoardFolder
            .add(this.game.stats, "best_solution")
            .name("Best Solution")
            .listen()
            .onChange(() => this.game.stats.updateDisplay());

        miniBoardFolder.open();
    }
}

/**
 * Main Game Class
 */
class Game {
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

        this.camera.position.z = 5;
        this.camera2.position.x = 1;
        this.camera2.position.z = 1;

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
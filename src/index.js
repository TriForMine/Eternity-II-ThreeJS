// Author:     Chahan
// Description: Main file for the game

// importing three js from internet
import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/build/three.module.js';
import { OrbitControls } from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/examples/jsm/controls/OrbitControls.js';
import * as dat from "https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js";

import { PieceCodes } from './ListPiece.js';
import { Solver } from './Solver.js';
import { Board } from './Board.js';
import { Statistics } from './Statistics.js';

var frames = 0;

var cameraAnimation = {
    "1": {
        camX: 1,
        camZ: 1,
        sceneX: 0,
        sceneZ: 0
    },
    "2": {
        camX: -1,
        camZ: -0.335,
        sceneX: -5.5,
        sceneZ: -2
    },
    "3": {
        // starting point 3 is "1" - "2"
        camX: 0,
        camZ: .665,
        sceneX: -5.5,
        sceneZ: -2
    },
    "4": {
        camX: 1,
        camZ: .335,
        sceneX: 5,
        sceneZ: 2
    }


}

var game = {
    // game object with all the THREE.js objects
    scene1: null,
    scene2: null,
    camera: null,
    camera2: null,
    activeCamera: null,
    controls: null,
    controls2: null,
    renderer: null,
    solver: null,
    piecesDesc: PieceCodes,
    board: null,
    intervalID: null,
    checkIntervalID: null,
    composer: null,
    iterationPerFrame: 1,
    requestCameraSwitch: false,
    stats: null,

    init: function() {
        //scene and renderer
        this.scene1 = new THREE.Scene();
        this.scene2 = new THREE.Scene();
        this.scene2.name = "scene2";
        this.scene1.background = new THREE.TextureLoader().load("public/George-peabody-library.jpg");
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.autoClear = false;

        // we add the orbit controls to the camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera2 = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.activeCamera = this.camera;
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls2 = new OrbitControls(this.camera2, this.renderer.domElement);
        this.controls2.enabled = false;
        this.camera.position.z = 5;
        this.camera2.position.z = 1;
        this.camera2.position.x = 1;


        // we initialize the board with 255 null pieces
        // to prevent any cases off the list to be empty
        let placedP = []
        for (let _ = 0; _ < 255; _++) {
            placedP[_] = null;
        }
        this.board = new Board(this, this.scene1, placedP);
        this.solver = new Solver(this);
        this.solver.initDict(PieceCodes);
        this.solver.initStack(this.board);
        resize();
        document.body.appendChild(this.renderer.domElement);
        // we add the stats to the scene
        this.stats = new Statistics(this);


    },

    initGui: function() {
        // GUI with button to add a piece, remove a piece and run the solver
        const gui = new dat.GUI();
        const commandFolder = gui.addFolder("Controls");
        const runCommand = {
            RunSolver: function() {
                game.solver.stop = false;
                game.stats.start();
            }
        };
        const stopCommand = {
            StopSolver: function() {
                game.solver.stop = true;
                this.intervalID = clearInterval(this.intervalID);
            }
        };
        const checkCommand = {
            Check: function() {
                // check the integrity of the board every second
                // print in the console the results
                if (game.checkIntervalID) {
                    game.checkIntervalID = clearInterval(game.checkIntervalID);
                } else {
                    game.checkIntervalID = setInterval(() => {
                        game.board.checkIntegrity(game.scene1);
                        game.stats.miniBoard.checkIntegrity(game.scene2);
                    }, 1000);
                }
            }
        };

        const switchCameraCommand = {
            SwitchCamera: function() {
                if (game.requestCameraSwitch) return;
                game.requestCameraSwitch = true;
            }
        };

        commandFolder.add(runCommand, "RunSolver");
        commandFolder.add(stopCommand, "StopSolver");
        commandFolder.add(checkCommand, "Check");
        commandFolder.add(switchCameraCommand, "SwitchCamera");
        commandFolder.open();

        // GUI to change the speed of the solver
        // by default solver runs one iteration per frame, this means 60 moves per second
        // the python code runs at about 2000 moves per second
        // we can do more than that in javascript
        const speedFolder = gui.addFolder("Speed");
        speedFolder.add(game, "iterationPerFrame", 1, 5000).step(1).onChange(function(value) {
            game.iterationPerFrame = value;
        });
        speedFolder.open();


        const statsFolder = gui.addFolder("Stats");
        statsFolder.add(game.stats, "moves_per_sec").listen().onChange(function(_) {
            updateDisplay();
        });
        statsFolder.add(game.stats, "elapsed_time").listen().onChange(function(_) {
            updateDisplay();
        });
        statsFolder.add(game.stats, "number_of_pieces").listen().onChange(function(_) {
            updateDisplay();
        });
        statsFolder.open();

        const miniBoardFolder = gui.addFolder("Best Solution");
        miniBoardFolder.add(game.stats, "best_solution").listen().onChange(function(_) {
            updateDisplay();
        })
    },
}

function cameraSwitch(time, duration) {
    // setting the correct animation for the camera switch
    if (game.activeCamera == game.camera) {
        var from = cameraAnimation["1"];
        var to = cameraAnimation["2"];
    }
    if (game.activeCamera == game.camera2) {
        var from = cameraAnimation["3"];
        var to = cameraAnimation["4"];
    }

    // easing the animation
    game.camera2.position.x = easeOutQuad(time, from.camX, to.camX, duration);
    game.camera2.position.z = easeOutQuad(time, from.camZ, to.camZ, duration);

    game.scene1.position.x = easeOutQuad(time, from.sceneX, to.sceneX, duration);
    game.scene1.position.z = easeOutQuad(time, from.sceneZ, to.sceneZ, duration);
}


function easeOutQuad(t, b, c, d) {
    return -c * (t /= d) * (t - 2) + b;
}

//rendering
function animate() {
    requestAnimationFrame(animate);
    if (!game.solver.stop) {
        for (let i = 0; i < game.iterationPerFrame; i++) {
            game.solver.solver(game.board);
        }
    }
    if (game.requestCameraSwitch) {
        cameraSwitch(frames++, 100);
    }

    if (frames === 100) {
        game.requestCameraSwitch = false;
        frames = 0;

        if (game.activeCamera === game.camera) {
            // we disable the controls when we switch to the second camera
            game.controls.enabled = false;
            game.controls2.enabled = true;
            game.activeCamera = game.camera2;
        } else {
            game.controls.enabled = true;
            game.controls2.enabled = false;
            game.activeCamera = game.camera;
        }
    }


    game.controls.update();

    game.renderer.clear();
    game.renderer.render(game.scene1, game.camera);
    game.renderer.clearDepth();
    game.renderer.render(game.scene2, game.camera2);
    resize();
}
game.init();
game.initGui();

game.solver.shuffle();

// to place the center piece, but it creates problems
game.solver.placeCenterPiece(game.board);

animate();

function resize() {
    game.renderer.height = window.innerHeight;
    game.renderer.width = window.innerWidth;
    game.renderer.setSize(game.renderer.width, game.renderer.height);
    game.camera.aspect = game.renderer.width / game.renderer.height;
    game.camera2.aspect = game.renderer.width / game.renderer.height;
    game.camera.updateProjectionMatrix();
    game.camera2.updateProjectionMatrix();
}
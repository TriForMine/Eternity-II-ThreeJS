import { Board } from "./Board.js";
import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r122/build/three.module.js';


export class Statistics {
    constructor(game) {
        this.game = game;
        this.clock = new THREE.Clock();
        this.moves_per_sec = "";
        this.elapsed_time = "";
        this.number_of_pieces = "";
        this.best_solution = "";
        this.intervalID = null;
        this.bestSolution = 0;
        // mini board with best solution found
        this.miniBoard = new Board(this.game, this.game.scene2, [...this.game.board.placedpieces]);
        this.miniBoard.mesh.scale.set(0.135, 0.135, 0.135);
    }

    start() {
        this.intervalID = setInterval(() => {
            this.update();
        }, 1000);
    }

    update() {
        // upadte the infos every second in the label  

        if (this.bestSolution < this.game.solver.lastPlacedCase) {
            this.bestSolution = this.game.solver.lastPlacedCase;
            this.miniBoard.clearBoard(this.game.scene2);
            let clone_of_pieces = this.game.board.clone();
            for (let i = 0; i < this.bestSolution; i++) {
                //-.9, .04, 0.1
                this.miniBoard.addPieceToSpot([clone_of_pieces[i].rotation, clone_of_pieces[i]], i);
            }
        }
        this.moves_per_sec = Math.floor(this.game.solver.numMoves) + " moves/s";
        this.elapsed_time = this.formatHour(this.clock.getElapsedTime());
        this.number_of_pieces = (this.game.solver.lastPlacedCase + 1) + " /256";
        this.game.solver.numMoves = 0;
        this.best_solution = this.miniBoard.length() + " /256";
    }

    formatHour(seconds) {
        // format the time in hour, minute, second
        let h = Math.floor(seconds / 3600);
        let m = Math.floor((seconds - h * 3600) / 60);
        let s = Math.floor(seconds - h * 3600 - m * 60);
        let str = "";
        if (h < 10) {
            str += "0" + h + ":";
        } else {
            str += h + ":";
        }
        if (m < 10) {
            str += "0" + m + ":";
        } else {
            str += m + ":";
        }
        if (s < 10) {
            str += "0" + s;
        } else {
            str += s;
        }
        return str;
    }

    stop() {
        this.intervalID = clearInterval(this.intervalID);
    }
}
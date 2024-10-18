/**
 * @file Statistics.js
 * @author Chahan
 * @author Quentin
 * @description Statistics of the game
 */

import {Board} from "./Board.js";
import {Clock} from 'three';

/**
 * @typedef {import('./Game').Game} Game
 * @typedef {import('three').Scene} Scene
 * @typedef {import('three').Clock} Clock
 */

/**
 * Class representing the statistics of the game.
 * @class
 * @public
 * @property {Game} game - The game instance.
 * @property {Clock} clock - The clock instance.
 * @property {string} moves_per_sec - The number of moves per second.
 * @property {string} elapsed_time - The elapsed time.
 * @property {string} number_of_pieces - The number of pieces placed.
 * @property {string} best_solution - The best solution found.
 * @property {number} bestSolution - The best solution found.
 * @property {Board} miniBoard - The mini board with the best solution found.
 * @property {number} intervalID - The interval ID.
 * @exports Statistics
 */
export class Statistics {
    /**
     * Creates an instance of the Statistics class.
     * @param {Game} game - The game instance.
     */
    constructor(game) {
        this.game = game;
        this.clock = new Clock();
        this.moves_per_sec = "";
        this.elapsed_time = "";
        this.number_of_pieces = "";
        this.best_solution = "";
        this.intervalID = null;
        this.movesPerSec = 0;
        this.bestSolution = 0;
        // mini board with the best solution found
        this.miniBoard = new Board(this.game, this.game.scene2, [...this.game.board.placedpieces]);
        this.miniBoard.mesh.scale.set(0.135, 0.135, 0.135);
    }

    /**
     * Starts the statistics update interval.
     */
    start() {
        this.intervalID = setInterval(() => {
            this.update();
        }, 1000);
    }

    /**
     * Updates the statistics every second.
     */
    update() {
        // update the infos every second in the label

        if (this.bestSolution < this.game.solver.lastPlacedCase) {
            this.bestSolution = this.game.solver.lastPlacedCase;
            this.miniBoard.clearBoard(this.game.scene2);
            const clone_of_pieces = this.game.board.clone();
            for (let i = 0; i < this.bestSolution; i++) {
                //-.9, .04, 0.1
                this.miniBoard.addPieceToSpot([clone_of_pieces[i].rotation, clone_of_pieces[i]], i);
            }
        }
        this.moves_per_sec = `${Math.floor(this.game.solver.numMoves)} moves/s`;
        this.movesPerSec = Math.floor(this.game.solver.numMoves);
        this.elapsed_time = this.formatHour(this.clock.getElapsedTime());
        this.number_of_pieces = `${this.game.solver.lastPlacedCase + 1} /256`;
        this.game.solver.numMoves = 0;
        this.best_solution = `${this.miniBoard.length()} /256`;
    }

    /**
     * Formats the elapsed time in hours, minutes, and seconds.
     * @param {number} seconds - The elapsed time in seconds.
     * @returns {string} - The formatted time string.
     */
    formatHour(seconds) {
        // format the time in hour, minute, second
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds - h * 3600) / 60);
        const s = Math.floor(seconds - h * 3600 - m * 60);
        let str = "";
        if (h < 10) {
            str += `0${h}:`;
        } else {
            str += `${h}:`;
        }
        if (m < 10) {
            str += `0${m}:`;
        } else {
            str += `${m}:`;
        }
        if (s < 10) {
            str += `0${s}`;
        } else {
            str += s;
        }
        return str;
    }

    /**
     * Stops the statistics update interval.
     */
    stop() {
        this.intervalID = clearInterval(this.intervalID);
    }
}
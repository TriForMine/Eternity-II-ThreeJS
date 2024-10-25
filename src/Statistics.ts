/**
 * @file Statistics.js
 * @author Chahan
 * @author Quentin
 * @description Statistics of the game
 */

import {Board} from "./Board.ts";
import {Clock} from 'three';
import type {Game} from "./main.ts";

export class Statistics {
	game: Game;
	clock: Clock;
	moves_per_sec: string;
	elapsed_time: string;
	number_of_pieces: string;
	best_solution: string;
	intervalID?: number;
	movesPerSec: number;
	bestSolution: number;
	miniBoard: Board;

	// FPS-related properties
	fps_display: string;
	private frameCount: number;
	private fps: number;

	constructor(game: Game) {
		this.game = game;
		this.clock = new Clock();
		this.moves_per_sec = "";
		this.elapsed_time = "";
		this.number_of_pieces = "";
		this.best_solution = "";
		this.fps_display = "";
		this.intervalID = undefined;
		this.movesPerSec = 0;
		this.bestSolution = 0;
		this.frameCount = 0;
		this.fps = 0;

		// mini board with the best solution found
		this.miniBoard = new Board(this.game, this.game.scene2, [...this.game.board.placedPieces.filter((piece) => piece !== undefined)]);
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
	 * Should be called every frame to increment the frame count.
	 */
	incrementFrame() {
		this.frameCount++;
	}

	/**
	 * Updates the statistics every second.
	 */
	update() {
		// Update FPS
		this.fps = this.frameCount;
		this.fps_display = `${this.fps} fps`;
		this.frameCount = 0; // Reset frame count for the next second

		// Update the infos every second in the label
		if (this.bestSolution < this.game.solver.lastPlacedCase) {
			this.bestSolution = this.game.solver.lastPlacedCase;
			this.miniBoard.clearBoard();
			const clone_of_pieces = this.game.board.clone();
			for (let i = 0; i < this.bestSolution; i++) {
				//-.9, .04, 0.1
				const piece = clone_of_pieces[i];
				if (piece !== undefined && piece !== null) {
					this.miniBoard.addPieceToSpot([piece.rotation, piece], i);
				}
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
	 */
	formatHour(seconds: number): string {
		// Format the time in hour, minute, second
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
		clearInterval(this.intervalID);
		this.intervalID = undefined;
	}
}

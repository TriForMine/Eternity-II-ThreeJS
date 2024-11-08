/**
 * @file Statistics.js
 * @description Statistics of the game with smoothed moves per second calculation
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
	lastPlacedCase: number;
	numMoves: number;
	totalNumMoves: number;

	// FPS-related properties
	fps_display: string;
	private frameCount: number;
	private fps: number;

	// Properties for smoothed moves per second
	private movesPerSecSamples: number[]; // Sliding window samples
	private readonly maxSamples: number; // Maximum number of samples to keep

	constructor(game: Game) {
		this.game = game;
		this.clock = new Clock();
		this.moves_per_sec = "0";
		this.elapsed_time = "00:00:00";
		this.number_of_pieces = "0 /256";
		this.best_solution = "0 /256";
		this.fps_display = "0 fps";
		this.intervalID = undefined;
		this.movesPerSec = 0;
		this.bestSolution = 0;
		this.frameCount = 0;
		this.fps = 0;
		this.numMoves = 0;
		this.totalNumMoves = 0;
		this.lastPlacedCase = -1;

		// Initialize smoothed moves per second properties
		this.movesPerSecSamples = [];
		this.maxSamples = 5; // e.g., average over last 5 seconds

		// mini board with the best solution found
		this.miniBoard = new Board(
			this.game,
			this.game.scene2,
			[...this.game.board.placedPieces.filter((piece) => piece !== undefined)]
		);
		this.miniBoard.mesh.scale.set(0.135, 0.135, 0.135);
	}

	/**
	 * Starts the statistics update interval.
	 */
	start() {
		this.clock.start(); // Ensure the clock starts when statistics start
		this.intervalID = setInterval(() => {
			this.update();
		}, 1000);
	}

	/**
	 * Should be called every frame to increment the frame count and moves.
	 */
	incrementFrame() {
		this.frameCount++;
		this.numMoves++;
	}

	/**
	 * Updates the statistics every second.
	 */
	update() {
		const elapsedTime = this.clock.getElapsedTime(); // Total elapsed time in seconds

		// Update FPS
		this.fps = this.frameCount;
		this.fps_display = `${this.fps} fps`;
		this.frameCount = 0; // Reset frame count for the next second

		// Update the infos every second in the label
		if (this.bestSolution < this.lastPlacedCase) {
			this.bestSolution = this.lastPlacedCase;
			this.miniBoard.clearBoard();
			const clone_of_pieces = this.game.board.clone();
			for (let i = 0; i < this.bestSolution; i++) {
				const piece = clone_of_pieces[i];
				if (piece !== undefined && piece !== null) {
					this.miniBoard.addPieceToSpot([piece.rotation, piece], i);
				}
			}
		}

		// Update the total number of moves
		this.totalNumMoves += this.numMoves

		// Update number of moves per second (current second)
		this.moves_per_sec = `${Math.floor(this.numMoves)}`;
		this.movesPerSec = Math.floor(this.numMoves);
		this.elapsed_time = this.formatHour(elapsedTime);
		this.number_of_pieces = `${this.lastPlacedCase + 1} /256`;
		this.best_solution = `${this.miniBoard.length()} /256`;

		// Manage the sliding window for moves per second
		this.movesPerSecSamples.push(this.numMoves);
		if (this.movesPerSecSamples.length > this.maxSamples) {
			this.movesPerSecSamples.shift(); // Remove the oldest sample
		}

		// Calculate the average moves per second from the samples
		const sumMoves = this.movesPerSecSamples.reduce((acc, curr) => acc + curr, 0);
		const averageMoves = sumMoves / this.movesPerSecSamples.length;
		this.moves_per_sec = `${averageMoves.toFixed(0)}`;
		this.movesPerSec = Math.floor(averageMoves);

		// Reset numMoves for the next second
		this.numMoves = 0;
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
		this.clock.stop(); // Stop the clock when statistics stop
	}
}

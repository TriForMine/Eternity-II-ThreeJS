// solverWorker.ts
/// <reference lib="webworker" />

import {Piece} from './Piece';
import {PieceCodes} from './ListPiece'; // Import the known piece codes
import type {PieceCode} from './ListPiece';
import {match} from "./Utils.ts";

interface SolverMessage {
	type: 'init' | 'solve' | 'stop';
	data?: any;
}

interface SolverResponse {
	type: 'update' | 'finished';
	data: any;
}

class SolverWorker {
	piecesDict: Piece[];
	stop: boolean;
	numMoves: number;
	lastPlacedCase: number;
	maxNumCase: number;
	stack: { piece: Piece | null; rotation: number; spot: number }[];
	placedPieces: (Piece | undefined)[];
	updateIntervalMs: number;
	lastUpdateTime: number;

	constructor() {
		this.piecesDict = [];
		this.stop = false;
		this.numMoves = 0;
		this.lastPlacedCase = -1;
		this.maxNumCase = 0;
		this.stack = [];
		this.placedPieces = Array(256).fill(undefined);
		this.updateIntervalMs = 1000; // Send updates every 1000 milliseconds
		this.lastUpdateTime = performance.now();
	}

	/**
	 * Initializes the pieces dictionary with the provided piece codes.
	 */
	initDict(piecesDesc: PieceCode[]) {
		for (const pieceCode of piecesDesc) {
			this.piecesDict.push(new Piece(pieceCode));
		}
		this.shuffle();
		this.initStack();
		this.placeCenterPiece();
	}

	/**
	 * Shuffles the pieces dictionary.
	 */
	shuffle() {
		for (let i = this.piecesDict.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.piecesDict[i], this.piecesDict[j]] = [this.piecesDict[j], this.piecesDict[i]];
		}
	}

	/**
	 * Initializes the stack with the first set of moves.
	 */
	initStack() {
		// Start with spot -1 to handle initial state properly
		this.stack.push({piece: null, rotation: 0, spot: -1});
	}

	/**
	 * Starts the solver loop.
	 */
	solve() {
		this.stop = false;
		this.solveNextBatch();
	}

	/**
	 * Places the center piece.
	 */
	placeCenterPiece() {
		const centerPiece = this.piecesDict.find((piece) => piece.name === 'FKRF');
		if (centerPiece) {
			this.removeFromDict(centerPiece.name);
			this.addPieceToSpot([2, centerPiece], 135);
		}
	}

	/**
	 * Processes steps until time slice expires and schedules the next batch.
	 */
	solveNextBatch() {
		if (this.stop || this.stack.length === 0) {
			// Solver has been stopped or finished
			const finishedMessage: SolverResponse = {
				type: 'finished',
				data: {
					boardState: this.getBoardState(),
					numMoves: this.numMoves,
					lastPlacedCase: this.lastPlacedCase,
				},
			};
			postMessage(finishedMessage, [finishedMessage.data.boardState]);
			return;
		}

		const startTime = performance.now();
		const timeSlice = 50; // milliseconds

		while (performance.now() - startTime < timeSlice) {
			if (this.stop || this.stack.length === 0) {
				break;
			}
			this.processStep();

			// Check if it's time to send an update
			if (performance.now() - this.lastUpdateTime >= this.updateIntervalMs) {
				this.lastUpdateTime = performance.now();
				const updateMessage: SolverResponse = {
					type: 'update',
					data: {
						boardState: this.getBoardState(),
						numMoves: this.numMoves,
						lastPlacedCase: this.lastPlacedCase,
					},
				};
				postMessage(updateMessage, [updateMessage.data.boardState]);
				this.numMoves = 0; // Reset move count for the next interval
			}
		}

		// Schedule the next batch
		setTimeout(() => {
			this.solveNextBatch();
		}, 0);
	}

	/**
	 * Processes a single step in the solver.
	 */
	processStep() {
		const state = this.stack.pop();
		if (!state) return;

		const {piece, spot, rotation} = state;

		// Backtracking
		for (let caseToRemove = this.lastPlacedCase; caseToRemove > spot - 1; caseToRemove--) {
			if (caseToRemove !== 135) {
				const removedPiece = this.removePieceFromSpot(caseToRemove);
				if (removedPiece) {
					this.addToDict(removedPiece);
				}
			}
		}

		this.lastPlacedCase = spot;

		if (spot !== 135) {
			if (piece) {
				// Place the piece
				this.addPieceToSpot([rotation, piece], spot);
				this.removeFromDict(piece.name);
			}
		}

		this.numMoves++;

		// Check if solution is found
		if (spot === 255) {
			// Solution found
			this.stop = true;
			return;
		}

		// Determine next spot
		const nextSpot = spot + 1;

		const listOfAvailableMoves = this.findMatchingPieces(this.getConstraints(nextSpot));
		// If no available moves, backtracking will occur on the next loop iteration
		for (const [nextRotation, nextPiece] of listOfAvailableMoves) {
			this.stack.push({piece: nextPiece, rotation: nextRotation, spot: nextSpot});
		}
	}

	/**
	 * Adds a piece to a specific spot.
	 */
	addPieceToSpot(tupleRotationPiece: [number, Piece], spot: number) {
		const [rotation, piece] = tupleRotationPiece;
		piece.rotation = rotation;
		this.placedPieces[spot] = piece;
		this.lastPlacedCase = spot;
		if (spot > this.maxNumCase) {
			this.maxNumCase = spot;
		}
	}

	/**
	 * Removes a piece from a specific spot.
	 */
	removePieceFromSpot(spot: number): Piece | undefined {
		const piece = this.placedPieces[spot];
		this.placedPieces[spot] = undefined;
		return piece;
	}

	/**
	 * Finds pieces that match the constraints.
	 */
	findMatchingPieces(constraints: string): [number, Piece][] {
		const listOfMatchingPieces: [number, Piece][] = [];
		for (const piece of this.piecesDict) {
			const m = match(piece.name, constraints);
			if (m !== -1) {
				listOfMatchingPieces.push([m, piece]);
			}
		}
		return listOfMatchingPieces;
	}

	/**
	 * Removes a piece from the dictionary.
	 */
	removeFromDict(name: PieceCode) {
		const index = this.piecesDict.findIndex((piece) => piece.name === name);
		if (index !== -1) {
			this.piecesDict.splice(index, 1);
		}
	}

	/**
	 * Adds a piece back to the dictionary.
	 */
	addToDict(piece: Piece) {
		this.piecesDict.push(piece);
	}

	/**
	 * Gets constraints for a spot.
	 */
	getConstraints(spot: number): string {
		const constraints = {
			top: '*',
			right: '*',
			bottom: '*',
			left: '*',
		};

		const col = spot % 16;
		const row = Math.floor(spot / 16);

		constraints.left = col === 0 ? 'X' : this.getEdges(spot - 1, 'right');
		constraints.top = row === 0 ? 'X' : this.getEdges(spot - 16, 'bottom');
		constraints.right = col === 15 ? 'X' : this.getEdges(spot + 1, 'left');
		constraints.bottom = row === 15 ? 'X' : this.getEdges(spot + 16, 'top');

		return constraints.top + constraints.right + constraints.bottom + constraints.left;
	}

	/**
	 * Gets edges for a spot.
	 */
	getEdges(spot: number, edge: string): string {
		const piece = this.placedPieces[spot];
		if (piece) {
			switch (edge) {
				case 'top':
					return piece.rotatedName[0];
				case 'right':
					return piece.rotatedName[1];
				case 'bottom':
					return piece.rotatedName[2];
				case 'left':
					return piece.rotatedName[3];
			}
		}
		return '*';
	}

	/**
	 * Returns the current board state as an ArrayBuffer.
	 */
	getBoardState(): ArrayBuffer {
		const placedPieces = [];
		for (let spot = 0; spot <= this.maxNumCase; spot++) {
			const piece = this.placedPieces[spot];
			if (piece) {
				placedPieces.push({spot, piece});
			}
		}

		const numPlacedPieces = placedPieces.length;
		const dataArray = new Uint8Array(numPlacedPieces * 3);
		let index = 0;

		for (const {spot, piece} of placedPieces) {
			const pieceIndex = PieceCodes.indexOf(piece.name); // Use index from the PieceCodes array
			dataArray[index++] = spot;           // Spot index
			dataArray[index++] = pieceIndex;     // Piece index
			dataArray[index++] = piece.rotation; // Rotation (0-3)
		}

		return dataArray.buffer; // Return the underlying ArrayBuffer
	}

	/**
	 * Stops the solver.
	 */
	stopSolver() {
		this.stop = true;
	}
}

const solver = new SolverWorker();

// Listen for messages from the main thread
self.onmessage = (event: MessageEvent<SolverMessage>) => {
	const message = event.data;
	switch (message.type) {
		case 'init':
			solver.initDict(message.data.pieceCodes);
			break;
		case 'solve':
			solver.solve();
			break;
		case 'stop':
			solver.stopSolver();
			break;
	}
};

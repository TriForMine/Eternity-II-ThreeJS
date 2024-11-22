// solverWorker.ts
/// <reference lib="webworker" />

import {type Direction, Piece} from './Piece';
import {PieceCodes} from './ListPiece'; // Import the known piece codes
import type {PieceCode} from './ListPiece';

export type SolverMessage =
	| {
	type: 'init';
	data: {
		pieceCodes: PieceCode[];
	};
}
	| {
	type: 'solve';
}
	| {
	type: 'pause';
} | {
	type: 'reset';
};

export interface SolverResponse {
	type: 'update' | 'finished';
	data: {
		boardState: ArrayBuffer;
		numMoves: number;
		lastPlacedCase: number;
	};
}

class SolverWorker {
	piecesMap: Map<string, Piece>; // Map of piece name to Piece
	stop: boolean;
	numMoves: number;
	lastPlacedCase: number;
	maxNumCase: number;
	stack: { piece: Piece | null; rotation: number; spot: number }[];
	placedPieces: (Piece | undefined)[];
	updateIntervalMs: number;
	lastUpdateTime: number;
	nextBatchTimeout?: number;

	// Index maps for quick lookup based on edge colors
	edgeIndex: Record<Direction, Map<string, Piece[]>> = {
		top: new Map(),
		right: new Map(),
		bottom: new Map(),
		left: new Map(),
	};

	constructor() {
		this.piecesMap = new Map();
		this.stop = true;
		this.numMoves = 0;
		this.lastPlacedCase = -1;
		this.maxNumCase = 0;
		this.stack = [];
		this.placedPieces = new Array(256).fill(undefined);
		this.updateIntervalMs = 500; // Send updates every 500 milliseconds
		this.lastUpdateTime = performance.now();
	}

	/**
	 * Initializes the pieces map with the provided piece codes and builds edge indices.
	 */
	initDict(piecesDesc: PieceCode[]) {
		for (const pieceCode of piecesDesc) {
			const piece = new Piece(pieceCode);
			this.piecesMap.set(piece.name, piece);
			this.indexPiece(piece);
		}
		this.shuffle();
		this.initStack();
		this.placeCenterPiece();
	}

	/**
	 * Indexes a piece's connectors for quick lookup based on edge colors.
	 *
	 * @param piece - The Piece to index.
	 */
	indexPiece(piece: Piece) {
		for (const rotation of piece.precomputedRotations) {
			for (const direction of ['top', 'right', 'bottom', 'left'] as Direction[]) {
				const color = rotation.connectors[direction].color;
				if (color !== '*') { // Only index pieces with actual connectors
					if (!this.edgeIndex[direction].has(color)) {
						this.edgeIndex[direction].set(color, []);
					}
					this.edgeIndex[direction].get(color)?.push(piece);
				}
			}
		}
	}

	/**
	 * Shuffles the pieces using Fisher-Yates algorithm.
	 */
	shuffle() {
		const piecesArray = Array.from(this.piecesMap.values());
		for (let i = piecesArray.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[piecesArray[i], piecesArray[j]] = [piecesArray[j], piecesArray[i]];
		}
		this.piecesMap = new Map(piecesArray.map(piece => [piece.name, piece]));
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
	 * Places the centerpiece.
	 */
	placeCenterPiece() {
		const centerPiece = Array.from(this.piecesMap.values()).find(piece => piece.name === 'FKRF');
		if (centerPiece) {
			centerPiece.rotation = 2;
			this.piecesMap.delete(centerPiece.name);
			this.placedPieces[135] = centerPiece;
			this.lastPlacedCase = 135;
			this.removePieceFromEdgeIndex(centerPiece);
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
		const timeSlice = 200; // milliseconds

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
		if (!this.stop) {
			this.nextBatchTimeout = setTimeout(() => {
				this.solveNextBatch();
			}, 0);
		}
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
					this.piecesMap.set(removedPiece.name, removedPiece);
					this.indexPiece(removedPiece); // Re-index the piece
				}
			}
		}

		this.lastPlacedCase = spot;

		if (spot !== 135) { // Skip the center piece
			if (piece) {
				// Place the piece
				this.addPieceToSpot(piece, rotation, spot);
				this.piecesMap.delete(piece.name);
				this.removePieceFromEdgeIndex(piece);
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

		const constraints = this.getConstraints(nextSpot);
		const listOfAvailableMoves = this.findMatchingPieces(constraints);
		// If no available moves, backtracking will occur on the next loop iteration
		for (const [nextPiece, rotation] of listOfAvailableMoves) {
			this.stack.push({piece: nextPiece, rotation: rotation, spot: nextSpot});
		}
	}

	/**
	 * Adds a piece to a specific spot with the given rotation.
	 *
	 * @param piece - The Piece to place.
	 * @param rotation - The rotation index (0-3).
	 * @param spot - The spot index on the board.
	 */
	addPieceToSpot(piece: Piece, rotation: number, spot: number) {
		piece.rotation = rotation;
		this.placedPieces[spot] = piece;
		this.lastPlacedCase = spot;
		if (spot > this.maxNumCase) {
			this.maxNumCase = spot;
		}
	}

	/**
	 * Removes a piece from a specific spot.
	 *
	 * @param spot - The spot index to remove the piece from.
	 * @returns The removed Piece, if any.
	 */
	removePieceFromSpot(spot: number): Piece | undefined {
		const piece = this.placedPieces[spot];
		this.placedPieces[spot] = undefined;
		return piece;
	}

	/**
	 * Removes a piece from the edge index after placement.
	 *
	 * @param piece - The Piece to remove from the edge index.
	 */
	removePieceFromEdgeIndex(piece: Piece) {
		for (const rotation of piece.precomputedRotations) {
			for (const direction of ['top', 'right', 'bottom', 'left'] as Direction[]) {
				const color = rotation.connectors[direction].color;
				if (color !== '*') {
					const piecesArray = this.edgeIndex[direction].get(color);
					if (piecesArray) {
						const index = piecesArray.indexOf(piece);
						if (index !== -1) {
							piecesArray.splice(index, 1);
							if (piecesArray.length === 0) {
								this.edgeIndex[direction].delete(color);
							}
						}
					}
				}
			}
		}
	}

	/**
	 * Finds pieces that match the constraints based on adjacent connectors.
	 *
	 * @param constraints - The required connectors for the spot.
	 * @returns An array of tuples containing the matching Piece and its rotation.
	 */
	findMatchingPieces(constraints: Record<Direction, string>): [Piece, number][] {
		// Determine the required connectors based on adjacent pieces
		// For example, if the top neighbor has a bottom connector 'R',
		// then the current piece's top connector must be 'R'

		// Collect the required connector colors for each direction
		const requiredConnectors: Partial<Record<Direction, string>> = {};

		if (constraints.top !== '*') {
			requiredConnectors.top = constraints.top;
		}
		if (constraints.right !== '*') {
			requiredConnectors.right = constraints.right;
		}
		if (constraints.bottom !== '*') {
			requiredConnectors.bottom = constraints.bottom;
		}
		if (constraints.left !== '*') {
			requiredConnectors.left = constraints.left;
		}

		// Find intersection of pieces matching all required connectors
		let possiblePieces: Set<Piece> | null = null;

		for (const [direction, color] of Object.entries(requiredConnectors) as [Direction, string][]) {
			const piecesWithConnector = this.edgeIndex[direction].get(color);
			if (!piecesWithConnector) {
				// No pieces match this connector
				return [];
			}
			const piecesSet = new Set(piecesWithConnector);
			if (possiblePieces === null) {
				possiblePieces = piecesSet;
			} else {
				// Intersection with existing possiblePieces
				possiblePieces = new Set([...possiblePieces].filter((piece: Piece) => piecesSet.has(piece)));
				if (possiblePieces.size === 0) {
					return [];
				}
			}
		}

		if (!possiblePieces) {
			// No constraints, all pieces are possible
			possiblePieces = new Set(this.piecesMap.values());
		}

		// For each possible piece, check all rotations to see if they satisfy all constraints
		const matchingPieces: [Piece, number][] = [];

		for (const piece of possiblePieces) {
			for (const rotation of piece.precomputedRotations) {
				let matches = true;
				for (const direction of ['top', 'right', 'bottom', 'left'] as Direction[]) {
					const requiredColor = requiredConnectors[direction];
					if (requiredColor) {
						const pieceColor = rotation.connectors[direction].color;
						if (pieceColor !== requiredColor) {
							matches = false;
							break;
						}
					}
				}
				if (matches) {
					matchingPieces.push([piece, rotation.rotation]);
				}
			}
		}

		return matchingPieces;
	}

	/**
	 * Gets constraints for a spot based on adjacent pieces.
	 *
	 * @param spot - The spot index on the board.
	 * @returns A record mapping each direction to the required connector color.
	 */
	getConstraints(spot: number): Record<Direction, string> {
		const constraints: Record<Direction, string> = {
			top: 'X',
			right: 'X',
			bottom: 'X',
			left: 'X',
		};

		const col = spot % 16;
		const row = Math.floor(spot / 16);

		if (row > 0) { // There is a top neighbor
			const topNeighbor = this.placedPieces[spot - 16];
			if (topNeighbor) {
				constraints.top = topNeighbor.getEdgeColor('bottom');
			} else {
				constraints.top = '*';
			}
		}

		if (col < 15) { // There is a right neighbor
			const rightNeighbor = this.placedPieces[spot + 1];
			if (rightNeighbor) {
				constraints.right = rightNeighbor.getEdgeColor('left');
			} else {
				constraints.right = '*';
			}
		}

		if (row < 15) { // There is a bottom neighbor
			const bottomNeighbor = this.placedPieces[spot + 16];
			if (bottomNeighbor) {
				constraints.bottom = bottomNeighbor.getEdgeColor('top');
			} else {
				constraints.bottom = '*';
			}
		}

		if (col > 0) { // There is a left neighbor
			const leftNeighbor = this.placedPieces[spot - 1];
			if (leftNeighbor) {
				constraints.left = leftNeighbor.getEdgeColor('right');
			} else {
				constraints.left = '*';
			}
		}

		return constraints;
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
			dataArray[index++] = spot; // Spot index
			dataArray[index++] = pieceIndex; // Piece index
			dataArray[index++] = piece.rotation; // Rotation (0-3)
		}

		return dataArray.buffer; // Return the underlying ArrayBuffer
	}

	/**
	 * Stops the solver.
	 */
	pauseSolver() {
		this.stop = true;

		// Clear the next batch timeout
		if (this.nextBatchTimeout) {
			clearTimeout(this.nextBatchTimeout);
		}
	}

	/**
	 * Resets the solver
	 */
	resetSolver() {
		this.stop = true;
		this.numMoves = 0;
		this.lastPlacedCase = -1;
		this.maxNumCase = 0;
		this.stack = [];
		this.placedPieces = new Array(256).fill(undefined);
		this.updateIntervalMs = 500; // Send updates every 500 milliseconds
		this.lastUpdateTime = performance.now();

		// Index maps for quick lookup based on edge colors
		this.edgeIndex = {
			top: new Map(),
			right: new Map(),
			bottom: new Map(),
			left: new Map(),
		};

		this.initDict(PieceCodes);
		this.initStack();
		this.placeCenterPiece();

		// Send the initial state
		const initialState: SolverResponse = {
			type: 'update',
			data: {
				boardState: this.getBoardState(),
				numMoves: this.numMoves,
				lastPlacedCase: this.lastPlacedCase,
			},
		};

		postMessage(initialState, [initialState.data.boardState]);
	}
}

// Instantiate the solver
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
		case 'pause':
			solver.pauseSolver();
			break;
		case 'reset':
			solver.resetSolver();
			break;
	}
};

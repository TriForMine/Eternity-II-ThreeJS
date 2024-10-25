/**
 * @file Solver.ts
 * @author Chahan
 * @author Quentin
 * @description Solver class for the game
 */

import {Piece} from './Piece.ts';
import type {Game} from './main.ts';
import type {Board} from "./Board.ts";
import type {PieceCode} from "./ListPiece.ts";

export class Solver {
	game: Game;
	piecesDict: Piece[];
	stack: { piece: Piece | null, rotation: number, spot: number }[];
	stop: boolean;
	numMoves: number;
	lastPlacedCase: number;
	maxNumCase: number;

	constructor(game: Game) {
		this.game = game;
		this.piecesDict = [];

		// the stack is a list of the next moves that will be made
		this.stack = [{piece: null, rotation: 0, spot: 0}];
		this.stop = true;
		this.numMoves = 0;
		this.lastPlacedCase = -1;
		this.maxNumCase = 0;
	}

	/**
	 * Initializes the pieces dictionary and shuffles the pieces.
	 */
	initDict(piecesDesc: PieceCode[]) {
		for (const piece of piecesDesc) {
			this.piecesDict.push(new Piece(piece, undefined));
		}
		this.shuffle();
	}

	/**
	 * Shuffles the pieces dictionary.
	 */
	shuffle() {
		// Shuffle the piecesDict
		for (let i = this.piecesDict.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.piecesDict[i], this.piecesDict[j]] = [this.piecesDict[j], this.piecesDict[i]];
		}
	}

	/**
	 * Rotates a string once.
	 */
	rotateStringOnce(str: string) {
		return str[1] + str[2] + str[3] + str[0];
	}

	/**
	 * Rotates a string a specified number of times.
	 */
	rotateString(str: string, times: number) {
		let rotatedStr = str;
		for (let j = 0; j < times; j++) {
			rotatedStr = this.rotateStringOnce(rotatedStr);
		}
		return rotatedStr;
	}

	/**
	 * Checks if a piece code matches the constraints.
	 */
	match(pieceCode: PieceCode, constraints: string) {
		// check if pieceCode matches constraints
		// return the rotation of the piece for matching
		// return -1 if no match
		let match = -1;
		const state = {
			top: false,
			right: false,
			bottom: false,
			left: false
		};
		let rotatedPieceCode = pieceCode;

		for (let i = 0; i < 4; i++) {
			state.top = (rotatedPieceCode[0] === constraints[0] || (constraints[0] === "*" && rotatedPieceCode[0] !== "X"));
			state.right = (rotatedPieceCode[1] === constraints[1] || (constraints[1] === "*" && rotatedPieceCode[1] !== "X"));
			state.bottom = (rotatedPieceCode[2] === constraints[2] || (constraints[2] === "*" && rotatedPieceCode[2] !== "X"));
			state.left = (rotatedPieceCode[3] === constraints[3] || (constraints[3] === "*" && rotatedPieceCode[3] !== "X"));

			if (state.top && state.right && state.bottom && state.left) {
				match = i;
				break;
			}
			rotatedPieceCode = this.rotateStringOnce(rotatedPieceCode);
		}
		return match;
	}

	/**
	 * Finds pieces that match the constraints.
	 */
	findMatchingPieces(constraints: string): [number, Piece][] {
		const listOfMatchingPieces: [number, Piece][] = [];
		for (const piece of this.piecesDict) {
			const match = this.match(piece.name, constraints);
			if (match !== -1) {
				listOfMatchingPieces.push([match, piece]);
			}
		}
		return listOfMatchingPieces;
	}

	/**
	 * Gets a piece by its name.
	 */
	getPieceByName(name: PieceCode): Piece | undefined {
		return this.piecesDict.find(piece => piece.name === name);
	}

	/**
	 * Removes a piece from the pieces' dictionary.
	 */
	removeFromDict(name: PieceCode) {
		const index = this.piecesDict.findIndex(piece => piece.name === name);
		if (index !== -1) {
			this.piecesDict.splice(index, 1);
		}
	}

	/**
	 * Adds a piece to the pieces' dictionary.
	 */
	addToDict(piece: Piece) {
		// add a piece to the piecesDict
		this.piecesDict.push(piece);
	}

	/**
	 * Initializes the stack with the first set of moves.
	 */
	initStack(board: Board) {
		// initialize the stack
		const listOfAvailableMoves = this.findMatchingPieces(board.getConstraints(0));

		for (const [rotation, piece] of listOfAvailableMoves) {
			this.stack.push({piece: piece, rotation: rotation, spot: 0});
		}
	}

	/**
	 * Places the centerpiece at spot 135 on the board.
	 */
	placeCenterPiece(board: Board) {
		const piece = this.getPieceByName("FKRF");
		if (piece) {
			this.removeFromDict(piece.name);
			const rotation = 2;
			board.addPieceToSpot([rotation, piece], 135);
		} else {
			console.warn("Center piece 'FKRF' not found.");
		}
	}

	/**
	 * Main solver function. Places the combination at the top of the stack.
	 */
	solve(board: Board) {
		if (this.stack.length === 0) {
			this.stop = true;
			return;
		}

		const state = this.stack.pop();
		if (!state)
			return;

		const piece = state.piece;
		const spot = state.spot;

		if (!piece) {
			console.warn("No piece to place at the current state.");
			return;
		}

		// Backtracking part
		for (let caseToRemove = this.lastPlacedCase; caseToRemove > spot - 1; caseToRemove--) {
			// remove all pieces from the board that are after the spot we are trying to place the piece
			// except the centerpiece
			if (caseToRemove !== 135) {
				const removedPiece = board.removePieceFromSpot(caseToRemove);
				if (removedPiece) {
					this.addToDict(removedPiece);
				}
			}
		}

		if (spot !== 135) {
			const rotation = this.match(piece.name, this.game.board.getConstraints(spot));
			if (rotation !== -1) {
				board.addPieceToSpot([rotation, piece], spot);
				this.numMoves++;
				this.removeFromDict(piece.name);

				this.lastPlacedCase = spot;
				if (spot > this.maxNumCase) {
					this.maxNumCase = spot;
				}

				if (spot === 255) {
					// we have a solution, very unlikely to happen before end of days
					this.stop = true;
				} else {
					const nextSpot = spot + 1;
					const listOfAvailableMoves = this.findMatchingPieces(board.getConstraints(nextSpot));

					for (const [rotation, piece] of listOfAvailableMoves) {
						this.stack.push({piece: piece, rotation: rotation, spot: nextSpot});
					}
				}
			} else {
				// If no valid rotation found, backtrack
				this.solve(board);
			}
		}
	}
}
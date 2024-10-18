/**
 * @file Solver.js
 * @author Chahan
 * @author Quentin
 * @description Solver class for the game
 */

import {Piece} from './Piece.js';

/**
 * @typedef {import('./Game.js').Game} Game
 * @typedef {import('./Board.js').Board} Board
 */

/**
 * Solver class for the game.
 * @class
 * @property {Game} game - The game instance.
 * @property {Piece[]} piecesDict - Dictionary of pieces.
 * @property {[int, Piece|null][]} stack - The stack of moves.
 * @property {boolean} stop - Flag to stop the solver.
 * @property {number} numMoves - The number of moves made.
 * @property {number} lastPlacedCase - The last placed case.
 * @property {number} maxNumCase - The maximum number of cases.
 * @exports Solver
 */
export class Solver {
    /**
     * Creates an instance of the Solver class.
     * @param {Game} game - The game instance.
     */
    constructor(game) {
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
     * @param {Piece[]} piecesDesc - Array of piece descriptions.
     */
    initDict(piecesDesc) {
        // initialize the piecesDict and shuffle the pieces
        for (const piece of piecesDesc) {
            this.piecesDict.push(new Piece(piece, null));
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
     * @param {string} str - The string to rotate.
     * @returns {string} - The rotated string.
     */
    rotateStringOnce(str) {
        return str[1] + str[2] + str[3] + str[0];
    }

    /**
     * Rotates a string a specified number of times.
     * @param {string} str - The string to rotate.
     * @param {number} times - The number of times to rotate the string.
     * @returns {string} - The rotated string.
     */
    rotateString(str, times) {
        let rotatedStr = str;
        for (let j = 0; j < times; j++) {
            rotatedStr = this.rotateStringOnce(rotatedStr);
        }
        return rotatedStr;
    }

    /**
     * Checks if a piece code matches the constraints.
     * @param {string} pieceCode - The piece code.
     * @param {string} constraints - The constraints.
     * @returns {number} - The rotation of the piece for matching, or -1 if no match.
     */
    match(pieceCode, constraints) {
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
     * @param {string} constraints - The constraints.
     * @returns {[int, Piece]} - A list of matching combinations, each item is a list of [rotation, piece].
     */
    findMatchingPieces(constraints) {
        // find pieces that matches the constraints
        // return a list of matching combinations, each item is a list of [rotation, piece]
        const listOfMatchingPieces = [];
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
     * @param {string} name - The name of the piece.
     * @returns {Piece|null} - The piece object or null if not found.
     */
    getPieceByName(name) {
        // get a piece by its name
        return this.piecesDict.find(piece => piece.name === name) || null;
    }

    /**
     * Removes a piece from the pieces dictionary.
     * @param {string} name - The name of the piece.
     */
    removeFromDict(name) {
        // remove a piece from the piecesDict
        const index = this.piecesDict.findIndex(piece => piece.name === name);
        if (index !== -1) {
            this.piecesDict.splice(index, 1);
        }
    }

    /**
     * Adds a piece to the pieces dictionary.
     * @param {Piece} piece - The piece to add.
     */
    addToDict(piece) {
        // add a piece to the piecesDict
        this.piecesDict.push(piece);
    }

    /**
     * Initializes the stack with the first set of moves.
     * @param {Board} board - The game board.
     */
    initStack(board) {
        // initialize the stack
        const listOfAvailableMoves = this.findMatchingPieces(board.getConstraints(0));

        for (const [rotation, piece] of listOfAvailableMoves) {
            this.stack.push({piece: piece, rotation: rotation, spot: 0});
        }
    }

    /**
     * Places the centerpiece at spot 135 on the board.
     * @param {Board} board - The game board.
     */
    placeCenterPiece(board) {
        // place the centerpiece at spot 135
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
     * @param {Board} board - The game board.
     */
    solve(board) {
        // this is the main solver function
        // at each iteration, it will place the combination at the top of the stack
        if (this.stack.length === 0) {
            this.stop = true;
            return;
        }

        const state = this.stack.pop();
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
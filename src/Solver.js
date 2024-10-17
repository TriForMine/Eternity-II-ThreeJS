// Author:      Chahan
// Description: Solver for the game
//

import { Piece } from './Piece.js';

export function Solver(game) {
    // dictionary of pieces
    // key is the piece code
    // value is the piece object
    // represents the pieces that are still available
    this.game = game;
    this.piecesDict = [];

    // the stack is a list of the next moves that will be made
    this.stack = [{ piece: null, rotation: 0, spot: 0 }];
    this.stop = true;
    this.numMoves = 0;
    this.lastPlacedCase = -1;
    this.maxNumCase = 0;

    this.initDict = (piecesDesc) => {
        // initialize the piecesDict and shuffle the pieces
        piecesDesc.forEach((piece) => {
            this.piecesDict.push(new Piece(piece, null));
        });
        this.shuffle(this.piecesDict);
    };

    this.shuffle = () => {
        // Shuffle the piecesDict
        for (let i = this.piecesDict.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = this.piecesDict[i];
            this.piecesDict[i] = this.piecesDict[j];
            this.piecesDict[j] = temp;
        }
    };

    this.rotateStringOnce = (str) => {
        return str[1] + str[2] + str[3] + str[0];
    };

    this.rotateString = (str, i) => {
        for (let j = 0; j < i; j++) {
            str = this.rotateStringOnce(str);
        }
        return str;
    };

    this.match = (pieceCode, constraints) => {
        // check if pieceCode matches constraints
        // return the rotation of the piece for matching
        // return -1 if no match
        let match = -1;
        let state = {
            top: false,
            right: false,
            bottom: false,
            left: false
        };
        for (let i = 0; i < 4; i++) {

            state.top = (pieceCode[0] === constraints[0] || (constraints[0] === "*" && pieceCode[0] !== "X"));
            state.right = (pieceCode[1] === constraints[1] || (constraints[1] === "*" && pieceCode[1] !== "X"));
            state.bottom = (pieceCode[2] === constraints[2] || (constraints[2] === "*" && pieceCode[2] !== "X"));
            state.left = (pieceCode[3] === constraints[3] || (constraints[3] === "*" && pieceCode[3] !== "X"));

            if (state.top && state.right && state.bottom && state.left) {
                match = i;
                break;
            } else {
                pieceCode = this.rotateStringOnce(pieceCode);
            }
        }
        return match;
    };

    this.findMatchingPieces = (constraints) => {
        // find pieces that matches the constraints
        // return a list of matching combinations, each item is a list of [rotation, piece]
        let matchingPiece = null;
        let listOfMatchingPieces = [];
        for (let i = 0; i < this.piecesDict.length; i++) {
            let match = this.match(this.piecesDict[i].name, constraints);
            if (match !== -1) {
                matchingPiece = this.piecesDict[i];
                listOfMatchingPieces.push([match, matchingPiece]);
            }
        }
        return listOfMatchingPieces;
    };

    this.getPieceByName = (name) => {
        // get a piece by its name
        let p = null;
        this.piecesDict.forEach((piece) => {
            if (piece.name === name) {
                p = piece;
            }
        })
        return p;
    };

    this.removeFromDict = (key) => {
        // remove a piece from the piecesDict
        for (let i = 0; i < this.piecesDict.length; i++) {
            if (this.piecesDict[i].name === key) {
                this.piecesDict.splice(i, 1);
                break;
            }
        }
    };

    this.addToDict = (piece) => {
        // add a piece to the piecesDict
        this.piecesDict.push(piece);
    };

    this.initStack = (board) => {
        // initialize the stack
        let listOfAvailableMoves = this.findMatchingPieces(board.getConstraints(0));
        for (let list of listOfAvailableMoves) {
            let rotation = list[0];
            let piece = list[1];
            this.stack.push({ piece: piece, rotation: rotation, spot: 0 });
        }
    };

    this.placeCenterPiece = (board) => {
        // place the center piece at spot 135
        let piece = this.getPieceByName("FKRF");
        this.removeFromDict(piece.name);
        let rotation = 2;
        board.addPieceToSpot([rotation, piece], 135);

    }

    this.solver = (board) => {
        // this is the main solver function
        // at each iteration, it will place the combination at the top of the stack
        let state = this.stack.pop();
        let piece = state.piece;
        //let rotation = state.rotation;  if we uncomment this line, the solver will some times put the piece with wring rotation
        let spot = state.spot;

        // the only fixed piece is the center piece
        // we have to make sure it is always on the board

        // backtracking part
        for (let caseToRemove = this.lastPlacedCase; caseToRemove > spot - 1; caseToRemove--) {
            // remove all pieces from the board that are after the spot we are trying to place the piece
            // except the center piece
            if (caseToRemove !== 135) {
                this.addToDict(board.removePieceFromSpot(caseToRemove));
            }
        }

        if (spot !== 135) {
            board.addPieceToSpot([this.match(piece.name, this.game.board.getConstraints(spot)), piece], spot);
        }
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
            spot++;
            let listOfAvailableMoves = this.findMatchingPieces(board.getConstraints(spot));
            for (const list of listOfAvailableMoves) {
                const r = list[0];
                const p = list[1];
                this.stack.push({ piece: p, rotation: r, spot: spot });
            }
        }
    }
}
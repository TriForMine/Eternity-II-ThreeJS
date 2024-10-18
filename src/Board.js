/**
 * @file Board.js
 * @author Chahan
 * @author Quentin
 * @description Board to represent the game board
 */

/**
 * @typedef {import('./Game').Game} Game
 * @typedef {import('./Piece').Piece} Piece
 * @typedef {import('three').Scene} Scene
 */

import {BoxGeometry, Mesh, MeshBasicMaterial, SRGBColorSpace, TextureLoader} from 'three';

/**
 * Class representing the game board.
 * @class
 * @public
 * @property {Game} game - The game instance.
 * @property {Scene} scene - The scene to which the board belongs.
 * @property {BoxGeometry} geometry - The geometry of the board.
 * @property {MeshBasicMaterial} material - The material of the board.
 * @property {Mesh} mesh - The mesh of the board.
 * @property {TextureLoader} outlineTexture - The texture of the outline.
 * @property {Piece[]} placedpieces - Array containing the placed pieces on the board.
 */
export class Board {
    /**
     * Creates an instance of the Board class.
     * @param {Game} game - The game instance.
     * @param {Scene} scene - The scene to which the board belongs.
     * @param {Piece[]} placedPieces - Array containing the placed pieces on the board.
     */
    constructor(game, scene, placedPieces) {
        this.game = game;
        this.scene = scene;
        this.geometry = new BoxGeometry(5.15, 5.15, 0.1);
        const texture = new TextureLoader().load("/Eternity-II-ThreeJS/BoardEternity2.png");
        texture.colorSpace = SRGBColorSpace;

        this.material = new MeshBasicMaterial({map: texture, transparent: true});

        this.mesh = new Mesh(this.geometry, this.material);
        this.outlineTexture = new TextureLoader().load("/Eternity-II-ThreeJS/outline.png");
        this.placedpieces = placedPieces;
        this.scene.add(this.mesh);
    }

    /**
     * Adds a piece to a specific spot on the board.
     * @param {[number, Piece]} tupleRotationPiece - Array containing rotation and piece.
     * @param {number} spot - The spot on the board where the piece should be placed.
     */
    addPieceToSpot(tupleRotationPiece, spot) {
        const piece = tupleRotationPiece[1];
        piece.rotation = tupleRotationPiece[0];
        piece.name = this.game.solver.rotateString(piece.name, piece.rotation);

        let width = 0;
        let height = 0;
        let offsetX = 0.15;
        let offsetY = 0.15;
        let offsetZ = 0.1;

        if (piece.isClone) {
            width = .66 / 17;
            height = .66 / 17;
            offsetX = offsetX / 8;
            offsetY = offsetY / 8;
            offsetZ = offsetZ / 8;
        } else {
            width = 5 / 17;
            height = 5 / 17;
        }
        const col = spot % 16 - 8;
        const row = -Math.floor(spot / 16) + 8;

        piece.mesh.rotateZ(this.toRadians(piece.rotation * 90));
        if (this.placedpieces[spot] !== null) {
            this.placedpieces[spot].remove(this.scene);
        }

        this.placedpieces[spot] = piece;

        this.placedpieces[spot].mesh.position.x = width * col + offsetX;
        this.placedpieces[spot].mesh.position.y = this.mesh.position.y - offsetY + height * row;
        this.placedpieces[spot].mesh.position.z = this.mesh.position.z + offsetZ;
        this.scene.add(this.placedpieces[spot].mesh);
    }

    /**
     * Removes a piece from a specific spot on the board.
     * @param {number} spot - The spot on the board from which the piece should be removed.
     * @returns {Piece} - The removed piece.
     */
    removePieceFromSpot(spot) {
        const p = this.placedpieces[spot];
        p.remove(this.scene);
        this.placedpieces[spot] = null;
        return p;
    }

    /**
     * Gets the constraints for a specific spot on the board.
     * @param {number} spot - The spot on the board.
     * @returns {string} - The constraints for the spot as a string.
     */
    getConstraints(spot) {
        const constraints = {
            top: null,
            right: null,
            bottom: null,
            left: null
        };

        const col = spot % 16;
        const row = Math.floor(spot / 16);

        constraints.left = (col === 0) ? "X" : this.getEdges(spot - 1, "right");
        constraints.top = (row === 0) ? "X" : this.getEdges(spot - 16, "bottom");
        constraints.right = (col === 15) ? "X" : this.getEdges(spot + 1, "left");
        constraints.bottom = (row === 15) ? "X" : this.getEdges(spot + 16, "top");

        return constraints.top + constraints.right + constraints.bottom + constraints.left;
    }

    /**
     * Gets the edges of a specific spot on the board.
     * @param {number} spot - The spot on the board.
     * @param {string} edge - The edge to get (top, right, bottom, left).
     * @returns {string} - The edge value.
     */
    getEdges(spot, edge) {
        if (this.placedpieces[spot] !== null && this.placedpieces[spot] !== undefined) {
            switch (edge) {
                case "top":
                    return this.placedpieces[spot].name[0];
                case "right":
                    return this.placedpieces[spot].name[1];
                case "bottom":
                    return this.placedpieces[spot].name[2];
                case "left":
                    return this.placedpieces[spot].name[3];
            }
        }
        return "*";
    }

    /**
     * Checks the integrity of the board.
     * @returns {boolean} - True if the board is valid, false otherwise.
     */
    checkIntegrity() {
        let err_count = 0;
        for (let i = 0; i < 256; i++) {
            if (this.placedpieces[i] !== null && this.placedpieces[i] !== undefined) {
                if (this.game.solver.match(this.placedpieces[i].name, this.getConstraints(i)) === -1) {
                    this.placedpieces[i].outline(this.scene);
                    console.log("Board integrity check failed");
                    console.log(`Spot: ${i} Constraints: ${this.getConstraints(i)} Piece: ${this.placedpieces[i].name}`);
                    err_count++;
                }
            }
        }
        if (err_count > 0) {
            console.log(`Board integrity check failed : ${err_count} errors`);
            this.game.solver.stop = true;
            return false;
        }
        console.log("Board integrity check passed");
    }

    /**
     * Converts an angle from degrees to radians.
     * @param {number} angle - The angle in degrees.
     * @returns {number} - The angle in radians.
     */
    toRadians(angle) {
        return angle * (Math.PI / 180);
    }

    /**
     * Converts an angle from radians to degrees.
     * @param {number} angle - The angle in radians.
     * @returns {number} - The angle in degrees.
     */
    toDegrees(angle) {
        return angle * (180 / Math.PI);
    }

    /**
     * Gets the number of pieces currently placed on the board.
     * @returns {number} - The number of placed pieces.
     */
    length() {
        let len = 0;
        for (const piece of this.placedpieces) {
            if (piece !== null && piece !== undefined) {
                len++;
            }
        }
        return len;
    }

    /**
     * Clones the current state of the board.
     * @returns {Piece[]} - A clone of the placed pieces array.
     */
    clone() {
        const Piece_On_Board = [];
        for (let i = 0; i < this.placedpieces.length; i++) {
            if (this.placedpieces[i] !== null && this.placedpieces[i] !== undefined) {
                Piece_On_Board.push(this.placedpieces[i].clone());
            } else {
                Piece_On_Board.push(null);
            }
        }
        return Piece_On_Board;
    }

    /**
     * Clears the board by removing all placed pieces.
     */
    clearBoard() {
        for (let i = 0; i < this.length(); i++) {
            if (this.placedpieces[i] !== null && this.placedpieces[i] !== undefined) {
                this.removePieceFromSpot(i);
            }
        }
    }

    /**
     * Gets the current solution of the board.
     * @returns {Piece[]} - The current state of the placed pieces array.
     */
    getCurrentSolution() {
        return [...this.placedpieces];
    }
}
/**
 * @file Board.ts
 * @author Chahan
 * @author Quentin
 * @description Board to represent the game board
 */

import {BoxGeometry, Mesh, MeshBasicMaterial, type Scene, SRGBColorSpace, type Texture, TextureLoader} from 'three';
import type {Game} from "./main.ts";
import {Piece} from "./Piece.ts";
import {match} from "./Utils.ts";

export type BoardState = (PieceData | null)[];

interface PieceData {
	name: string;
	rotation: number;
	spot: number;
}

export class Board {
	game: Game;
	scene: Scene;
	geometry: BoxGeometry;
	material: MeshBasicMaterial;
	mesh: Mesh;
	outlineTexture: Texture;
	placedPieces: (Piece | undefined)[];

	constructor(game: Game, scene: Scene, placedPieces: Piece[]) {
		this.game = game;
		this.scene = scene;
		this.geometry = new BoxGeometry(5.15, 5.15, 0.1);
		const texture = new TextureLoader().load("/Eternity-II-ThreeJS/BoardEternity2.png");
		texture.colorSpace = SRGBColorSpace;

		this.material = new MeshBasicMaterial({map: texture, transparent: true});

		this.mesh = new Mesh(this.geometry, this.material);
		this.outlineTexture = new TextureLoader().load("/Eternity-II-ThreeJS/outline.png");
		this.placedPieces = placedPieces;
		this.scene.add(this.mesh);
	}

	/**
	 * Updates the board state from a serialized state.
	 */
	updateFromState(boardState: BoardState) {
		// Clear existing pieces
		this.clearBoard();

		// Reconstruct the board from the received state
		for (const pieceData of boardState) {
			if (pieceData) {
				const piece = new Piece(pieceData.name, undefined, pieceData.rotation);
				this.addPieceToSpot([piece.rotation, piece], pieceData.spot);
			}
		}
	}

	/**
	 * Adds a piece to a specific spot on the board.
	 */
	addPieceToSpot(tupleRotationPiece: [number, Piece], spot: number) {
		const piece = tupleRotationPiece[1];
		piece.rotation = tupleRotationPiece[0];

		let width: number;
		let height: number;
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

		piece.mesh?.rotateZ(this.toRadians(piece.rotation * 90));
		if (this.placedPieces[spot] !== null && this.placedPieces[spot] !== undefined) {
			this.placedPieces[spot].remove(this.scene);
		}

		this.placedPieces[spot] = piece;

		if (this.placedPieces[spot].mesh) {
			this.placedPieces[spot].mesh.position.x = width * col + offsetX;
			this.placedPieces[spot].mesh.position.y = this.mesh.position.y - offsetY + height * row;
			this.placedPieces[spot].mesh.position.z = this.mesh.position.z + offsetZ;
			this.scene.add(this.placedPieces[spot].mesh);
		}
	}

	/**
	 * Removes a piece from a specific spot on the board.
	 */
	removePieceFromSpot(spot: number) {
		const p = this.placedPieces[spot];
		p?.remove(this.scene);
		this.placedPieces[spot] = undefined;
		return p;
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
	 * Gets the edges of a specific spot on the board.
	 */
	getEdges(spot: number, edge: string): string {
		if (this.placedPieces[spot] !== null && this.placedPieces[spot] !== undefined) {
			switch (edge) {
				case "top":
					return this.placedPieces[spot]?.rotatedName[0];
				case "right":
					return this.placedPieces[spot]?.rotatedName[1];
				case "bottom":
					return this.placedPieces[spot]?.rotatedName[2];
				case "left":
					return this.placedPieces[spot]?.rotatedName[3];
			}
		}
		return "*";
	}

	/**
	 * Checks the integrity of the board.
	 */
	checkIntegrity(): boolean {
		for (let i = 0; i < 256; i++) {
			const piece = this.placedPieces[i];
			if (piece !== null && piece !== undefined) {
				const constraints = this.getConstraints(i);
				const matchResult = match(piece.rotatedName, constraints);
				if (matchResult === -1) {
					piece.outline(this.scene);
					return false;
				}
			}
		}
		return true
	}

	/**
	 * Converts an angle from degrees to radians.
	 */
	toRadians(angle: number) {
		return angle * (Math.PI / 180);
	}

	/**
	 * Gets the number of pieces currently placed on the board.
	 */
	length() {
		let len = 0;
		for (const piece of this.placedPieces) {
			if (piece !== null && piece !== undefined) {
				len++;
			}
		}
		return len;
	}

	/**
	 * Clones the current state of the board.
	 */
	clone(): (Piece | undefined)[] {
		const Piece_On_Board = [];
		for (let i = 0; i < this.placedPieces.length; i++) {
			const piece = this.placedPieces[i];
			if (piece !== undefined && piece !== null) {
				Piece_On_Board.push(piece.clone());
			} else {
				Piece_On_Board.push(undefined);
			}
		}
		return Piece_On_Board;
	}

	/**
	 * Clears the board by removing all placed pieces.
	 */
	clearBoard() {
		for (let i = 0; i < 256; i++) {
			if (this.placedPieces[i] !== null && this.placedPieces[i] !== undefined) {
				this.removePieceFromSpot(i);
			}
		}
	}
}
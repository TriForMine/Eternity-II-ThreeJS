/**
 * @file Piece.ts
 * @description Piece class with precomputed rotations and color-based edge constraints.
 */

import {
	BoxGeometry,
	Mesh,
	MeshBasicMaterial,
	TextureLoader,
	type Scene,
} from 'three';
import type { PieceCode } from './ListPiece';
import { rotateString } from './Utils';
import TextureManager from './TextureManager';

/**
 * Directions for edges.
 */
export type Direction = 'top' | 'right' | 'bottom' | 'left';

/**
 * Interface for edge connectors.
 */
interface Connector {
	color: string; // Represents the color or type of the connector
}

/**
 * Interface for precomputed rotation data.
 */
export interface PrecomputedRotation {
	rotation: number; // Rotation index (0-3)
	rotatedName: PieceCode; // Rotated piece name
	connectors: Record<Direction, Connector>; // Connectors for each direction
}

/**
 * Piece class representing a game piece with multiple rotations and color-based connectors.
 */
export class Piece {
	name: PieceCode;
	mesh?: Mesh;
	rotation: number;
	scale: number;
	isClone: boolean;
	geometry?: BoxGeometry;
	material?: MeshBasicMaterial;
	outlineGeometry?: BoxGeometry;
	outlineMaterial?: MeshBasicMaterial;
	outlineMesh?: Mesh;

	// Array holding all precomputed rotations
	precomputedRotations: PrecomputedRotation[] = [];

	/**
	 * Getter for the currently rotated name based on the current rotation.
	 */
	get rotatedName(): PieceCode {
		return rotateString(this.name, this.rotation);
	}

	constructor(
		name: PieceCode,
		mesh?: Mesh,
		rotation = 0,
		scale: number = 5 / 16.7
	) {
		this.name = name;
		this.scale = scale;
		this.rotation = rotation;
		this.isClone = false;

		// Precompute all rotations upon initialization
		this.precomputeRotations();

		if (typeof document !== 'undefined') {
			if (mesh) {
				this.mesh = mesh;
				this.mesh.scale.set(scale, scale, 0.1);
				this.isClone = true;
			} else {
				this.geometry = new BoxGeometry(scale, scale, 0.1);
				const texture = TextureManager.getInstance().getTexture(name);
				this.material = new MeshBasicMaterial({ map: texture, transparent: false });
				this.mesh = new Mesh(this.geometry, this.material);
			}
		}
	}

	/**
	 * Precomputes all possible rotations for the piece and stores the connectors for each direction.
	 */
	precomputeRotations() {
		for (let rot = 0; rot < 4; rot++) {
			const rotatedName = rotateString(this.name, rot);
			const connectors = this.parseConnectors(rotatedName);
			this.precomputedRotations.push({
				rotation: rot,
				rotatedName: rotatedName,
				connectors: connectors,
			});
		}
	}

	/**
	 * Parses the rotated name to extract connector colors for each direction.
	 * Assumes that the rotatedName string has connectors in the order: top, right, bottom, left.
	 * Each connector character represents a color or type (e.g., 'R' for red, 'G' for green).
	 * 'X' represents no connector.
	 *
	 * @param rotatedName - The name of the piece after rotation.
	 * @returns A record mapping each direction to its connector.
	 */
	parseConnectors(rotatedName: PieceCode): Record<Direction, Connector> {
		const connectors: Record<Direction, Connector> = {
			top: { color: '*' },
			right: { color: '*' },
			bottom: { color: '*' },
			left: { color: '*' },
		};

		const connectorChars = rotatedName.split(''); // e.g., ['A', 'Q', 'X', 'X']

		const directions: Direction[] = ['top', 'right', 'bottom', 'left'];

		connectorChars.forEach((char, index) => {
			const direction = directions[index];
			connectors[direction].color = char;
		});

		return connectors;
	}

	/**
	 * Retrieves the connector color for a specific direction based on the current rotation.
	 *
	 * @param direction - The direction to retrieve ('top', 'right', 'bottom', 'left').
	 * @returns The color of the connector, or 'X' if there is no connector.
	 */
	getEdgeColor(direction: Direction): string {
		const currentRotation = this.precomputedRotations[this.rotation];
		return currentRotation.connectors[direction].color;
	}

	/**
	 * Generates an outline around the piece to show error on the board.
	 *
	 * @param scene - The Three.js scene where the outline should be added.
	 */
	outline(scene: Scene) {
		this.outlineGeometry = new BoxGeometry(5 / 16.7, 5 / 16.7, 0.1);
		this.outlineMaterial = new MeshBasicMaterial({
			map: new TextureLoader().load('/Eternity-II-ThreeJS/outline.png'),
			transparent: true,
		});
		this.outlineMesh = new Mesh(this.outlineGeometry, this.outlineMaterial);
		scene.add(this.outlineMesh);
		this.outlineMesh.position.z = 0.1;

		if (!this.mesh) return;

		this.outlineMesh.position.x = this.mesh.position.x;
		this.outlineMesh.position.y = this.mesh.position.y;
	}

	/**
	 * Removes the piece from the scene.
	 *
	 * @param scene - The Three.js scene from which the piece should be removed.
	 */
	remove(scene: Scene) {
		if (!this.mesh) return;

		scene.remove(this.mesh);

		// Dispose of geometry and material
		this.mesh.geometry.dispose();
		if (Array.isArray(this.mesh.material)) {
			for (const material of this.mesh.material) {
				material.dispose();
			}
		} else {
			this.mesh.material.dispose();
		}

		// Dispose of outline mesh, geometry, and material
		if (this.outlineMesh) {
			scene.remove(this.outlineMesh);
			this.outlineGeometry?.dispose();
			if (this.outlineMaterial?.map) {
				this.outlineMaterial.map.dispose();
			}
			this.outlineMaterial?.dispose();
		}
	}

	/**
	 * Clones the current piece.
	 *
	 * @returns A new Piece instance that is a clone of the current piece.
	 */
	clone(): Piece {
		if (!this.mesh) return new Piece(this.name, undefined, 0, 2.3 / 16.7);
		const mesh = this.mesh.clone();
		mesh.rotation.z = 0;
		return new Piece(this.name, mesh, this.rotation, 2.3 / 16.7);
	}
}

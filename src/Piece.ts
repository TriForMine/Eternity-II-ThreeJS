/**
 * @file Piece.ts
 * @author Chahan
 * @author Quentin
 * @description Piece class for the game
 */
import {BoxGeometry, Mesh, MeshBasicMaterial, TextureLoader, SRGBColorSpace, type Scene} from 'three';
import type {PieceCode} from "./ListPiece.ts";

export class Piece {
	name: PieceCode;
	mesh: Mesh;
	rotation: number;
	scale: number;
	isClone: boolean;
	geometry?: BoxGeometry;
	material?: MeshBasicMaterial;
	outlineGeometry?: BoxGeometry;
	outlineMaterial?: MeshBasicMaterial;
	outlineMesh?: Mesh;

	constructor(name: string, mesh?: Mesh, rotation = 0, scale: number = 5 / 16.7) {
		this.name = name;
		this.scale = scale;
		this.rotation = rotation;
		this.isClone = false;

		if (mesh) {
			this.mesh = mesh;
			this.mesh.scale.set(scale, scale, 0.1);
			this.isClone = true;
		} else {
			this.geometry = new BoxGeometry(scale, scale, 0.1);
			const texture = new TextureLoader().load(`/Eternity-II-ThreeJS/pieces/${name}.png`);
			texture.colorSpace = SRGBColorSpace;
			this.material = new MeshBasicMaterial({map: texture, transparent: false,});
			this.mesh = new Mesh(this.geometry, this.material);
		}
	}

	/**
	 * Generates an outline around the piece to show error on the board.
	 */
	outline(scene: Scene) {
		this.outlineGeometry = new BoxGeometry(5 / 16.7, 5 / 16.7, 0.1);
		this.outlineMaterial = new MeshBasicMaterial({
			map: new TextureLoader().load("/Eternity-II-ThreeJS/outline.png"),
			transparent: true,
		});
		this.outlineMesh = new Mesh(this.outlineGeometry, this.outlineMaterial);
		scene.add(this.outlineMesh);
		this.outlineMesh.position.z = 0.1;
		this.outlineMesh.position.x = this.mesh.position.x;
		this.outlineMesh.position.y = this.mesh.position.y;
	}

	/**
	 * Removes the piece from the scene.
	 */
	remove(scene: Scene) {
		scene.remove(this.mesh);
	}

	/**
	 * Clones the current piece.
	 */
	clone(): Piece {
		return new Piece(this.name, this.mesh.clone(), 0, 2.3 / 16.7);
	}
}
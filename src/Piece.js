/**
 * @file Piece.js
 * @author Chahan
 * @author Quentin
 * @description Piece class for the game
 */
import {BoxGeometry, Mesh, MeshBasicMaterial, TextureLoader, SRGBColorSpace} from 'three';

/**
 * @typedef {import('three').Scene} Scene
 * @typedef {import('three').Mesh} Mesh
 * @typedef {import('three').BoxGeometry} BoxGeometry
 * @typedef {import('three').MeshBasicMaterial} MeshBasicMaterial
 * @typedef {import('three').TextureLoader} TextureLoader
 */

/**
 * Class representing a piece.
 * @class
 * @classdesc A piece is a single square of the puzzle.
 * @property {string} name - The name of the piece.
 * @property {Mesh} mesh - The mesh of the piece.
 * @property {number} rotation - The rotation of the piece.
 * @property {number} scale - The scale of the piece.
 * @property {boolean} isClone - Indicates whether the piece is a clone.
 * @property {BoxGeometry} geometry - The geometry of the piece.
 * @property {MeshBasicMaterial} material - The material of the piece.
 * @property {BoxGeometry} outlineGeometry - The geometry of the outline.
 * @property {MeshBasicMaterial} outlineMaterial - The material of the outline.
 * @property {Mesh} outlineMesh - The mesh of the outline.
 * @exports Piece
 */
export class Piece {
    /**
     * Creates an instance of the Piece class.
     * @param {string} name - The name of the piece.
     * @param {Mesh} mesh - The mesh of the piece.
     * @param {number} [rotation=0] - The rotation of the piece.
     * @param {number} [scale=5/16.7] - The scale of the piece.
     */
    constructor(name, mesh, rotation = 0, scale = 5 / 16.7) {
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
     * @param {Scene} scene - The scene to which the outline will be added.
     */
    outline(scene) {
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
     * @param {Scene} scene - The scene from which the piece will be removed.
     */
    remove(scene) {
        scene.remove(this.mesh);
    }

    /**
     * Clones the current piece.
     * @returns {Piece} - A new Piece instance that is a clone of the current piece.
     */
    clone() {
        return new Piece(this.name, this.mesh.clone(), 0, 2.3 / 16.7);
    }
}
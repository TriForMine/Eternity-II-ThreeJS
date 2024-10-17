import {BoxGeometry, Mesh, MeshBasicMaterial, TextureLoader} from 'three';

export class Piece {
    constructor(name, mesh, rotaton = 0, scale = 5 / 16.7) {
        // function generates a piece with a name and initializes the mesh according to name
        // name is the name of the pieceCode
        this.name = name;
        this.scale = scale;
        this.rotation = rotaton;
        this.isClone = false;

        if (mesh) {
            this.mesh = mesh;
            this.mesh.scale.set(scale, scale, 0.1);
            this.isClone = true;
        } else {
            this.geometry = new BoxGeometry(scale, scale, 0.1);
            this.material = new MeshBasicMaterial({ map: new TextureLoader().load("pieces/" + name + ".png"), transparent: false, });
            this.mesh = new Mesh(this.geometry, this.material);
        }
    };

    outline(scene) {
        // generates an outline around the piece to show error on the board
        this.outlineGeometry = new BoxGeometry(5 / 16.7, 5 / 16.7, 0.1);
        this.outlineMaterial = new MeshBasicMaterial({ map: new TextureLoader().load("outline.png"), transparent: true, });
        this.outlineMesh = new Mesh(this.outlineGeometry, this.outlineMaterial);
        scene.add(this.outlineMesh);
        this.outlineMesh.position.z = 0.1;
        this.outlineMesh.position.x = this.mesh.position.x;
        this.outlineMesh.position.y = this.mesh.position.y;
    };

    remove(scene) {
        scene.remove(this.mesh);
    };

    clone() {
        return new Piece(this.name, this.mesh.clone(), 0, 2.3 / 16.7);
    };
}
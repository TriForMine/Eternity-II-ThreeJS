// Author:     Chahan
// Description: Board to represent the game board
import {BoxGeometry, Mesh, MeshBasicMaterial, SRGBColorSpace, TextureLoader} from 'three';
export class Board {
    constructor(game, scene, placedpieces) {
        // this is the actual board
        this.game = game;
        this.scene = scene;
        this.geometry = new BoxGeometry(5.15, 5.15, 0.1);
        let texture = new TextureLoader().load("/Eternity-II-ThreeJS/BoardEternity2.png");
        texture.colorSpace = SRGBColorSpace;

        this.material = new MeshBasicMaterial({ map: texture, transparent: true });

        this.mesh = new Mesh(this.geometry, this.material);
        this.outlineTexture = new TextureLoader().load("/Eternity-II-ThreeJS/outline.png");
        this.placedpieces = placedpieces;
        this.scene.add(this.mesh);
    }

    addPieceToSpot(tupleRotationPiece, spot) {
        // tupleRotationPiece is a list of [rotation, piece]
        let piece = tupleRotationPiece[1];
        piece.rotation = tupleRotationPiece[0];
        piece.name = this.game.solver.rotateString(piece.name, piece.rotation);

        let width = 0;
        let height = 0;
        let offsetX = 0.15;
        let offsetY = 0.15;
        let offsetZ = 0.1


        if (piece.isClone) {
            width = .66 / 17;
            height = .66 / 17;
            offsetX = offsetX / 8;
            offsetY = offsetY / 8;
            offsetZ = offsetZ / 8;
        } else {
            width = width = 5 / 17;
            height = 5 / 17;
        }
        const col = spot % 16 - 8;
        const row = -Math.floor(spot / 16) + 8;

        // add piece to list of placed pieces
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

    removePieceFromSpot(spot) {
        // remove a piece from a spot and returns it so it can be re add to remainig pieces
        const p = this.placedpieces[spot];
        p.remove(this.scene);
        this.placedpieces[spot] = null;
        return p;
    }

    getConstraints(spot) {
        //returns the constraints for a spot as a string, ex: "XRRR"
        // easier for patern matching
        let constraints = {
            top: null,
            right: null,
            bottom: null,
            left: null
        };

        let col = spot % 16;
        let row = Math.floor(spot / 16);

        constraints.left = (col === 0) ? "X" : this.getEdges(spot - 1, "right");
        constraints.top = (row === 0) ? "X" : this.getEdges(spot - 16, "bottom");
        constraints.right = (col === 15) ? "X" : this.getEdges(spot + 1, "left");
        constraints.bottom = (row === 15) ? "X" : this.getEdges(spot + 16, "top");


        return constraints.top + constraints.right + constraints.bottom + constraints.left;
    }

    getEdges(spot, edge) {
        // get the edges of a spot
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
        } else {
            return "*";
        }
    }

    checkIntegrity() {
        // Définir la couleur rouge
        let err_count = 0;
        // check if the board is still valid
        for (let i = 0; i < 256; i++) {
            if (this.placedpieces[i] !== null && this.placedpieces[i] !== undefined) {
                if (this.game.solver.match(this.placedpieces[i].name, this.getConstraints(i)) === -1) {
                    // outline the piece 
                    this.placedpieces[i].outline(this.scene);
                    console.log("Board integrity check failed");
                    console.log("Spot: " + i + " Constraints: " + this.getConstraints(i) + " Piece: " + this.placedpieces[i].name);
                    err_count++;
                }
            }
        }
        if (err_count > 0) {
            console.log("Board integrity check failed : " + err_count + " errors");
            this.game.solver.stop = true;
            return false;
        }
        console.log("Board integrity check passed");
    }

    toRadians(angle) {
        return angle * (Math.PI / 180);
    }

    toDegrees(angle) {
        return angle * (180 / Math.PI);
    }

    length() {
        let len = 0;
        this.placedpieces.forEach(piece => {
            if (piece !== null && piece !== undefined) {
                len++;
            }
        });
        return len;
    }

    clone() {
        let Piece_On_Board = [];
        for (let i = 0; i < this.placedpieces.length; i++) {
            if (this.placedpieces[i] !== null && this.placedpieces[i] !== undefined) {
                Piece_On_Board.push(this.placedpieces[i].clone());
            } else {
                Piece_On_Board.push(null);
            }
        }
        return Piece_On_Board;
    }

    clearBoard() {
        for (let i = 0; i < this.length(); i++) {
            if (this.placedpieces[i] !== null && this.placedpieces[i] !== undefined) {
                this.removePieceFromSpot(i);
            }
        }
    }

    getCurrentSolution() {
        return [...this.placedpieces];
    }
}
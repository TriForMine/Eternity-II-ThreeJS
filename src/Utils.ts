/**
 * @file Utils.ts
 * @description Utility functions for string manipulation and matching.
 */

import type { PieceCode } from './ListPiece';

/**
 * Rotates a string once.
 *
 * @param str - The string to rotate.
 * @returns The rotated string.
 */
export function rotateStringOnce(str: string): string {
	return str[1] + str[2] + str[3] + str[0];
}

/**
 * Rotates a string a number of times.
 *
 * @param str - The string to rotate.
 * @param times - The number of times to rotate.
 * @returns The rotated string.
 */
export function rotateString(str: string, times: number): string {
	let rotatedStr = str;
	for (let j = 0; j < times; j++) {
		rotatedStr = rotateStringOnce(rotatedStr);
	}
	return rotatedStr;
}

/**
 * Checks if a piece code matches the constraints.
 *
 * @param pieceCode - The piece code to check.
 * @param constraints - The constraints string.
 * @returns The rotation index if matched, -1 otherwise.
 */
export function match(pieceCode: PieceCode, constraints: string): number {
	let rotatedPieceCode = pieceCode;

	for (let i = 0; i < 4; i++) {
		const state = {
			top:
				rotatedPieceCode[0] === constraints[0] ||
				(constraints[0] === '*' && rotatedPieceCode[0] !== 'X'),
			right:
				rotatedPieceCode[1] === constraints[1] ||
				(constraints[1] === '*' && rotatedPieceCode[1] !== 'X'),
			bottom:
				rotatedPieceCode[2] === constraints[2] ||
				(constraints[2] === '*' && rotatedPieceCode[2] !== 'X'),
			left:
				rotatedPieceCode[3] === constraints[3] ||
				(constraints[3] === '*' && rotatedPieceCode[3] !== 'X'),
		};

		if (state.top && state.right && state.bottom && state.left) {
			return i;
		}
		rotatedPieceCode = rotateStringOnce(rotatedPieceCode);
	}
	return -1;
}

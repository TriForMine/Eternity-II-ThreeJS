/**
 * @file TextureManager.ts
 * @description Manages loading and retrieval of textures for the pieces.
 */

import { type Texture, TextureLoader, SRGBColorSpace } from 'three';

class TextureManager {
	private static instance: TextureManager;
	private textures = new Map<string, Texture>();
	private loader = new TextureLoader();

	private constructor() {}

	public static getInstance(): TextureManager {
		if (!TextureManager.instance) {
			TextureManager.instance = new TextureManager();
		}
		return TextureManager.instance;
	}

	public async loadTextures(names: string[]): Promise<void> {
		const loadPromises = names.map((name) => {
			if (!this.textures.has(name)) {
				return new Promise<void>((resolve) => {
					this.loader.load(`/Eternity-II-ThreeJS/pieces/${name}.png`, (texture) => {
						texture.colorSpace = SRGBColorSpace;
						this.textures.set(name, texture);
						resolve();
					});
				});
			}
			return Promise.resolve();
		});
		await Promise.all(loadPromises);
	}

	public getTexture(name: string): Texture {
		const texture = this.textures.get(name);
		if (texture === undefined) {
			throw new Error(`Texture ${name} not found`);
		}
		return texture;
	}
}

export default TextureManager;

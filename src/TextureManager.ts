// TextureManager.ts
import {type Texture, TextureLoader, SRGBColorSpace} from 'three';

class TextureManager {
	private static instance: TextureManager;
	private textures: Map<string, Texture>;
	private loader: TextureLoader;

	private constructor() {
		this.textures = new Map<string, Texture>();
		this.loader = new TextureLoader();
	}

	public static getInstance(): TextureManager {
		if (!TextureManager.instance) {
			TextureManager.instance = new TextureManager();
		}
		return TextureManager.instance;
	}

	public getTexture(name: string): Texture {
		if (this.textures.has(name)) {
			return <Texture>this.textures.get(name);
		}

		const texture = this.loader.load(`/Eternity-II-ThreeJS/pieces/${name}.png`);
		texture.colorSpace = SRGBColorSpace;
		this.textures.set(name, texture);
		return texture;
	}

	public async loadTextures(names: string[]): Promise<void> {
		const promises = names.map((name) => {
			return new Promise<void>((resolve) => {
				this.loader.load(`/Eternity-II-ThreeJS/pieces/${name}.png`, (texture) => {
					texture.colorSpace = SRGBColorSpace;
					this.textures.set(name, texture);
					resolve();
				});
			});
		});
		await Promise.all(promises);
	}
}

export default TextureManager;

// src/i18n.ts

interface Translations {
	[key: string]: string;
}

class I18n {
	private translations: Translations = {};
	private currentLang = 'en';
	private availableLangs: string[] = ['en', 'fr'];

	constructor(defaultLang = 'en') {
		if (this.availableLangs.includes(defaultLang)) {
			this.currentLang = defaultLang;
		}
	}

	async loadTranslations(lang: string): Promise<void> {
		let l = lang;
		if (!this.availableLangs.includes(l)) {
			console.error(`Language ${l} is not available`);
			// Default to English
			l = 'en';
		}

		try {
			const response = await fetch(`/Eternity-II-ThreeJS/locales/${l}.json`);
			if (!response.ok) throw new Error(`Failed to load ${l} translations`);
			this.translations = await response.json();
			this.currentLang = l;
			this.applyTranslations();
		} catch (error) {
			console.error(error);
		}
	}

	applyTranslations(): void {
		const elements = document.querySelectorAll('[data-i18n]');
		for (const elem of elements) {
			const key = elem.getAttribute('data-i18n');
			if (key && this.translations[key]) {
				elem.textContent = this.translations[key];
			}
		}
	}

	getCurrentLanguage(): string {
		return this.currentLang;
	}

	getAvailableLanguages(): string[] {
		return this.availableLangs;
	}
}

export default I18n;

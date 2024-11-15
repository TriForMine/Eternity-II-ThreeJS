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
		if (!this.availableLangs.includes(lang)) {
			console.error(`Language ${lang} is not available`);
			// Default to English
			lang = 'en';
		}

		try {
			const response = await fetch(`/Eternity-II-ThreeJS/locales/${lang}.json`);
			if (!response.ok) throw new Error(`Failed to load ${lang} translations`);
			this.translations = await response.json();
			this.currentLang = lang;
			this.applyTranslations();
		} catch (error) {
			console.error(error);
		}
	}

	applyTranslations(): void {
		const elements = document.querySelectorAll('[data-i18n]');
		elements.forEach(elem => {
			const key = elem.getAttribute('data-i18n');
			if (key && this.translations[key]) {
				elem.textContent = this.translations[key];
			}
		});
	}

	getCurrentLanguage(): string {
		return this.currentLang;
	}

	getAvailableLanguages(): string[] {
		return this.availableLangs;
	}
}

export default I18n;

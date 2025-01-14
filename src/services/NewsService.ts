// ... previous code remains the same ...

    private async saveSourcesToFile(): Promise<void> {
        try {
            await fs.mkdir(path.dirname(this.sourcesFile), { recursive: true });
            await fs.writeFile(this.sourcesFile, JSON.stringify(this.sources, null, 2));
        } catch (error) {
            console.error('Error saving sources:', error);
        }
    }

    private async loadSourcesFromFile(): Promise<void> {
        try {
            const data = await fs.readFile(this.sourcesFile, 'utf8');
            const loadedSources = JSON.parse(data);
            // Merge with default sources
            Object.keys(loadedSources).forEach(category => {
                if (category in this.sources) {
                    this.sources[category as keyof typeof this.sources] = [
                        ...new Set([...this.sources[category as keyof typeof this.sources], ...loadedSources[category]])
                    ];
                }
            });
        } catch (error) {
            console.log('Using default sources');
            await this.saveSourcesToFile();
        }
    }
}
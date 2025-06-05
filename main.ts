import { App, Plugin, PluginSettingTab, Setting, TFile, TFolder, Notice } from 'obsidian';
import JSZip from 'jszip';

interface VaultImporterSettings {
    importPath: string;
}

const DEFAULT_SETTINGS: VaultImporterSettings = {
    importPath: ''
}

export default class VaultImporterPlugin extends Plugin {
    settings: VaultImporterSettings;

    async onload() {
        await this.loadSettings();

        // Add command to import zip file
        this.addCommand({
            id: 'import-zip-vault',
            name: 'Import Files from ZIP',
            callback: () => this.importZipFile()
        });

        // Add settings tab
        this.addSettingTab(new VaultImporterSettingTab(this.app, this));
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async importZipFile() {
        // Create file input element
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.zip';
        
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            try {
                const zip = new JSZip();
                const zipContent = await zip.loadAsync(file);
				const imageTypes = ['.png', '.jpg', '.jpeg', '.gif'];
				const overwriteFiles = this.settings.overwriteFiles;

                // Process each file in the zip
                for (const [filePath, zipEntry] of Object.entries(zipContent.files)) {
                    if (zipEntry.dir) continue; // Skip directories
					if (zipEntry.name.indexOf('/.') !== -1) continue; // skip hidden files

					const fileName = filePath.replace(/^.*[\\/]/, '');
					let content;

                    // Get file content
					if (imageTypes.some(e => fileName.endsWith(e))) {
						content = await (zipEntry as JSZip.JSZipObject).async('arrayBuffer');
					} else {
						content = await (zipEntry as JSZip.JSZipObject).async('string');
					}
                    
                    let targetPath = this.settings.importPath + "/" + filePath;

                    // Handle CSS files specially
					// If there are css files in the template, we move them to the snippets folder
                    if (filePath.endsWith('.css')) {
                        try {
                            const snippetsPath = this.app.vault.configDir + '/snippets';
							try {
								await this.app.vault.createFolder(snippetsPath)
							} catch { /* Snippets folder already exists */ }
                            
                            // Move CSS file to snippets folder
                            targetPath = snippetsPath + "/" + fileName;
                            try {
                                await this.app.vault.create(targetPath, content);
                            } catch (error) {
								if (overwriteFiles) await this.app.vault.adapter.write(targetPath, content);
							}

                            continue;
                        } catch (error) {
							// error handling css file, it will stay in the template folder instead
                        }
                    }
                    
                    // Ensure file directories exist
                    const targetDir = targetPath.replace(fileName, '');
					console.log(targetDir);
                    if (targetDir !== '.') {
                        try {
                            await this.app.vault.createFolder(targetDir);
                        } catch (error) {
                            // Ignore folder if it already exists
                            if (!error.message.includes('already exists')) continue; 
                        }
                    }
					
					// Handle images
					if (imageTypes.some(e => fileName.endsWith(e))) {
						try {
							await this.app.vault.createBinary(targetPath, content);
							new Notice (`Image created: ${fileName}`);
						} catch (error) {
							if (overwriteFiles) {
								new Notice(`Image updated: ${fileName}`);
								await this.app.vault.adapter.writeBinary(targetPath, content);
							} else {
								new Notice(`Image already exists: ${fileName}`);
							}
						}
						continue;
					}
                    
                    // Handle all other file in the vault
					try {
						await this.app.vault.create(targetPath, content);
						new Notice(`File created: ${fileName}`);
					} catch (error) {
						if (overwriteFiles) {
							await this.app.vault.adapter.write(targetPath, content);
							new Notice(`File overwritten: ${fileName}`);
						} else {
							new Notice(`File already exists: ${fileName}`);
						}
						console.log(error);
					}
                }

                new Notice('Files imported successfully!');
            } catch (error) {
                new Notice(`Error importing files: ${error.message}`);
                console.warn('Import error:', error);
            }
        };

        input.click();
    }
}

class VaultImporterSettingTab extends PluginSettingTab {
    plugin: VaultImporterPlugin;

    constructor(app: App, plugin: VaultImporterPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Import Path')
            .setDesc('The folder where imported files will be placed (leave blank for root folder)')
            .addText(text => text
                .setPlaceholder('Enter import path')
                .setValue(this.plugin.settings.importPath)
                .onChange(async (value) => {
                    this.plugin.settings.importPath = value;
                    await this.plugin.saveSettings();
                }));

		new Setting(containerEl)
			.setName('Overwrite Files')
			.setDesc('Be careful! This setting will cause existing templates to be overwritten. This is desirable if you are updating a template, but otherwise I would leave this off.')
			.addToggle(text => text
				.setValue(this.plugin.settings.overwriteFiles)
				.onChange(async (value) => {
					this.plugin.settings.overwriteFiles = value;
					await this.plugin.saveSettings();
				})
			);
    }
} 

import { App, Plugin, PluginSettingTab, Setting, TFile, TFolder, Notice } from 'obsidian';
import JSZip from 'jszip';
import * as path from 'path';

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
                
                // Process each file in the zip
                for (const [filePath, zipEntry] of Object.entries(zipContent.files)) {
                    if (zipEntry.dir) continue; // Skip directories

                    // Get file content
                    const content = await (zipEntry as JSZip.JSZipObject).async('string');
                    
                    // Handle CSS files specially
                    let targetPath = path.join(this.settings.importPath, filePath);
                    if (filePath.endsWith('.css')) {
                        try {
                            // Try to create the snippets folder directly
                            const snippetsPath = path.join(this.app.vault.configDir, 'snippets');
                            try {
                                await this.app.vault.createFolder(snippetsPath);
                                console.log('Created snippets folder');
                            } catch (error) {
                                // Ignore error if folder already exists
                                if (!error.message.includes('already exists')) {
                                    throw error;
                                }
                                console.log('Snippets folder already exists');
                            }
                            
                            // Move CSS file to snippets folder
                            targetPath = path.join(snippetsPath, path.basename(filePath));
                            console.log(`Moving CSS file to: ${targetPath}`);
                            
                            // Check if file already exists
                            const existingFile = this.app.vault.getAbstractFileByPath(targetPath);
                            if (existingFile && existingFile instanceof TFile) {
                                // Update existing file
                                await this.app.vault.modify(existingFile, content);
                                console.log(`Updated existing file: ${targetPath}`);
                            } else {
                                // Create new file
                                await this.app.vault.create(targetPath, content);
                                console.log(`Created new file: ${targetPath}`);
                            }
                            continue; // Skip the file creation at the end
                        } catch (error) {
                            console.log('Error handling CSS file:', error);
                            console.log('Placing CSS file in import path instead');
                        }
                    }
                    
                    // Ensure the directory exists
                    const targetDir = path.dirname(targetPath);
                    if (targetDir !== '.') {
                        try {
                            await this.app.vault.createFolder(targetDir);
                        } catch (error) {
                            // Ignore error if folder already exists
                            if (!error.message.includes('already exists')) {
                                throw error;
                            }
                        }
                    }
                    
                    // Create the file in the vault
                    await this.app.vault.create(targetPath, content);
                }

                new Notice('Files imported successfully!');
            } catch (error) {
                new Notice(`Error importing files: ${error.message}`);
                console.error('Import error:', error);
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
    }
} 
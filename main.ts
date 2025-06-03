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
                    
                    // Create the file in the vault
                    const targetPath = path.join(this.settings.importPath, filePath);
                    
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
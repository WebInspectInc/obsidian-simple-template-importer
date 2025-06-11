# Simple Template Importer for Obsidian

A simple plugin that allows you to install template vaults more easily in your own vault.

Notion has a one-click install option for templates, which is sweet. Anyone can build a solution and publish it for others to install in a single click.

In Obsidian, it's a little more complex.

- Not every platform supports drag-and-drop, so you have to copy files over with a file explorer
- Templates need to be installed in the configured templates folder
- CSS Snippets need to be installed in a hidden folder, also confusing to the end user
- And plugin settings are a whole other issue

I got frustrated with the number of steps it takes to install templates into an existing Obsidian vault, and this is my solution.

## Installing a Template Vault using the Template Importer
In order to install a template vault into your own vault, you will need to:

- Install this plugin from Community Plugins (pending review)
- Download a template vault in the form of a .zip file
- Open the command palette, search for "Import Files from Zip", and select your zip file.
- You're done!

This plugin currently imports all markdown files from a Zip file, and places .css files in the appropriate snippets folder.

At the moment it _ignores_ plugins, but eventually I would like for it to support basic plugin management as well.

I wish Obsidian had one-click installation of templates, like Notion does. But until they do, this is at least a little easier than the regular process.


#!/bin/bash

# Install Obsidian LLM Tagger Enhanced Plugin
# This script builds and installs the plugin to your Obsidian vault

set -e  # Exit on error

echo "========================================="
echo "Obsidian LLM Tagger Enhanced - Installer"
echo "========================================="
echo ""

# Build the plugin
echo "Building plugin..."
npm run build

if [ $? -ne 0 ]; then
    echo "Error: Build failed. Please fix any errors and try again."
    exit 1
fi

echo "Build completed successfully!"
echo ""

# Prompt for vault path
echo "Enter the full path to your Obsidian vault:"
echo "(e.g., /Users/yourname/Documents/MyVault)"
echo ""
echo "Note: Enter the vault ROOT directory, not the .obsidian folder"
echo "Example: /Users/yourname/Library/Mobile Documents/iCloud~md~obsidian/Documents/MyVault"
read -r VAULT_PATH

# Remove trailing slash if present
VAULT_PATH="${VAULT_PATH%/}"

# Check if user accidentally provided the .obsidian path
if [[ "$VAULT_PATH" == *"/.obsidian" ]]; then
    echo ""
    echo "⚠️  It looks like you provided the .obsidian directory path."
    echo "Please provide the VAULT ROOT directory instead."
    echo ""
    echo "You entered: $VAULT_PATH"
    echo "You should use: ${VAULT_PATH%/.obsidian}"
    echo ""
    exit 1
fi

# Check if vault path exists
if [ ! -d "$VAULT_PATH" ]; then
    echo "Error: Vault path does not exist: $VAULT_PATH"
    exit 1
fi

# Check if .obsidian directory exists
if [ ! -d "$VAULT_PATH/.obsidian" ]; then
    echo ""
    echo "Error: .obsidian directory not found in: $VAULT_PATH"
    echo ""
    echo "This doesn't appear to be a valid Obsidian vault."
    echo "Please make sure you're providing the vault ROOT directory,"
    echo "not a subdirectory within the vault."
    echo ""
    exit 1
fi

# Create plugins directory if it doesn't exist
PLUGINS_DIR="$VAULT_PATH/.obsidian/plugins"
if [ ! -d "$PLUGINS_DIR" ]; then
    echo "Creating plugins directory..."
    mkdir -p "$PLUGINS_DIR"
fi

# Create plugin directory
PLUGIN_DIR="$PLUGINS_DIR/llm-tagger-enhanced"
if [ ! -d "$PLUGIN_DIR" ]; then
    echo "Creating plugin directory..."
    mkdir -p "$PLUGIN_DIR"
else
    echo "Plugin directory already exists. Updating files..."
fi

# Copy files
echo "Copying plugin files..."
cp main.js "$PLUGIN_DIR/"
cp manifest.json "$PLUGIN_DIR/"
cp styles.css "$PLUGIN_DIR/"

echo ""
echo "========================================="
echo "Installation completed successfully!"
echo "========================================="
echo ""
echo "Plugin installed to: $PLUGIN_DIR"
echo ""
echo "Next steps:"
echo "1. Open Obsidian"
echo "2. Go to Settings → Community plugins"
echo "3. Enable 'LLM Tagger Enhanced' if it's not already enabled"
echo "4. Configure the plugin in Settings → LLM Tagger Enhanced"
echo ""
echo "New features in this enhanced version:"
echo "  ✓ Multi-language support (19 languages)"
echo "  ✓ Custom instructions for LLM"
echo "  ✓ Proper frontmatter integration"
echo "  ✓ Clean tag structure"
echo ""
echo "If Obsidian was already open, you may need to:"
echo "  - Disable and re-enable the plugin, or"
echo "  - Restart Obsidian"
echo ""

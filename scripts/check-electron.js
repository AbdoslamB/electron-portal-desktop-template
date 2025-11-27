#!/usr/bin/env node
const { execSync } = require('child_process');
const readline = require('readline');

const MIN_NODE_MAJOR = 18; // Minimum supported Node major version

function checkNodeVersion() {
    const ver = process.version.replace(/^v/, '');
    const [major] = ver.split('.').map(Number);
    if (Number.isNaN(major) || major < MIN_NODE_MAJOR) {
        console.error('\x1b[31m%s\x1b[0m', `✖ Node ${MIN_NODE_MAJOR}.x or newer is required. You have ${process.version}.`);
        console.error('\x1b[33m%s\x1b[0m', 'Please upgrade Node.js (https://nodejs.org/) and re-run `npm install`.');
        process.exit(1);
    }
}

function runNpmInstall() {
    execSync('npm install', { stdio: 'inherit' });
}

function promptYesNo(prompt) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(`${prompt} (Y/n) `, (answer) => {
            rl.close();
            const normalized = (answer || 'y').trim().toLowerCase();
            resolve(normalized === 'y' || normalized === 'yes' || normalized === '');
        });
    });
}

async function checkElectron() {
    checkNodeVersion();
    try {
        // Try to resolve electron from the project root
        require.resolve('electron');
        console.log('\x1b[32m%s\x1b[0m', '✔ Electron is installed.');
        return true;
    } catch (err) {
        console.warn('\x1b[33m%s\x1b[0m', '⚠ Electron not found.');

        if (process.stdin.isTTY) {
            const shouldInstall = await promptYesNo('Electron is not installed. Install dependencies now?');
            if (shouldInstall) {
                try {
                    runNpmInstall();
                } catch (installerErr) {
                    console.error('\x1b[31m%s\x1b[0m', '✖ Failed to install dependencies automatically. Please run `npm install` manually and re-run `npm start`.');
                    process.exit(1);
                }
            } else {
                console.log('\x1b[33m%s\x1b[0m', 'Please run `npm install` manually to install dependencies and re-run `npm start`.');
                process.exit(1);
            }
        } else {
            // Non-interactive environment (CI, etc.) — run npm install automatically
            try {
                runNpmInstall();
            } catch (installerErr) {
                console.error('\x1b[31m%s\x1b[0m', '✖ Failed to install dependencies automatically in non-interactive session. Please run `npm install` manually.');
                process.exit(1);
            }
        }

        // Re-check
        try {
            require.resolve('electron');
            console.log('\x1b[32m%s\x1b[0m', '✔ Electron has been installed.');
            return true;
        } catch (err2) {
            console.error('\x1b[31m%s\x1b[0m', '✖ Electron still not found after running npm install.');
            process.exit(1);
        }
    }
}

if (require.main === module) {
    (async () => {
        await checkElectron();
    })();
}

module.exports = checkElectron;

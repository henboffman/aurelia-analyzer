const fs = require('fs');
const path = require('path');
const { analyzeAureliaApp } = require('./analyzer');
const { COLORS } = require('./utils');

const aureliaAppDir = process.argv[2];
const focusComponent = process.argv[3];

if (!aureliaAppDir) {
    console.error('Please provide the Aurelia application directory as an argument.');
    process.exit(1);
}

analyzeAureliaApp(aureliaAppDir, focusComponent);
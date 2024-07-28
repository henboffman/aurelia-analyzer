const fs = require('fs');
const path = require('path');
const { COLORS, createTable, normalizeComponentName, escapeRegExp } = require('./utils');
const { scanDirectory } = require('./fileScanner');
const { detectCircularDependencies } = require('./dependencyAnalyzer');
const { generateReport } = require('./reportGenerator');
const { generateFullDependencyGraph, generateFocusedDependencyGraph } = require('./graphGenerator');

function analyzeAureliaApp(directory, focusComponent) {
    const components = [];
    const dependencies = {};
    const componentUsage = {};
    const publishedEvents = {};
    const eventSubscriptions = {};
    const exportDir = 'exports';
    const currentDate = new Date();
    const dateString = `${currentDate.toLocaleString('default', { month: 'long' })}-${currentDate.getDate()}`;

    // Ensure export directory exists
    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir);
    }

    const { components: scannedComponents, dependencies: scannedDependencies, componentUsage: scannedComponentUsage, publishedEvents: scannedPublishedEvents, eventSubscriptions: scannedEventSubscriptions } = scanDirectory(directory);

    components.push(...scannedComponents);
    Object.assign(dependencies, scannedDependencies);
    Object.assign(componentUsage, scannedComponentUsage);
    Object.assign(publishedEvents, scannedPublishedEvents);
    Object.assign(eventSubscriptions, scannedEventSubscriptions);

    generateReport(components, dependencies, componentUsage, publishedEvents, eventSubscriptions, exportDir, dateString);
    generateFullDependencyGraph(dependencies, focusComponent, exportDir, dateString);

    if (focusComponent) {
        if (components.includes(normalizeComponentName(focusComponent))) {
            generateFocusedDependencyGraph(dependencies, normalizeComponentName(focusComponent), exportDir, dateString);
        } else {
            console.log(`\n${COLORS.FgYellow}Warning: Component "${focusComponent}" not found in the scanned files. Focused graph not generated.${COLORS.Reset}`);
        }
    }

    return { components, dependencies, componentUsage };
}

module.exports = { analyzeAureliaApp };
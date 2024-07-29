const fs = require('fs');
const path = require('path');
const { COLORS, createTable, createCSV } = require('./utils');
const { detectCircularDependencies } = require('./dependencyAnalyzer');

function generateReport(components, dependencies, componentUsage, publishedEvents, eventSubscriptions, exportDir, dateString) {
    let reportContent = generateReportHeader();

    reportContent += generateCircularDependenciesSection(dependencies);
    reportContent += generateComponentUsageSection(componentUsage, exportDir, dateString);
    reportContent += generateDependenciesSection(components, dependencies, exportDir, dateString);
    reportContent += generateEventsAnalysisSection(publishedEvents, eventSubscriptions, exportDir, dateString);
    reportContent += generateEventSubscriptionsSection(eventSubscriptions);

    const reportFileName = writeReportToFile(reportContent, exportDir, dateString);
    logReportGeneration(components.length, reportFileName);
}

function generateReportHeader() {
    return 'Aurelia Application Analysis Report\n===================================\n\n';
}

function generateCircularDependenciesSection(dependencies) {
    const circularDeps = detectCircularDependencies(dependencies);
    if (circularDeps.length > 0) {
        return `${COLORS.FgRed}Circular Dependencies Detected:\n` +
            '--------------------------------\n' +
            circularDeps.map(cycle => `${cycle}\n`).join('') +
            `${COLORS.Reset}\n`;
    }
    return `${COLORS.FgGreen}No circular dependencies detected.\n\n${COLORS.Reset}`;
}

function generateComponentUsageSection(componentUsage, exportDir, dateString) {
    const usageHeaders = ['Component', 'Usage Count'];
    const sortedUsage = Object.entries(componentUsage).sort((a, b) => b[1] - a[1]);
    const usageRows = sortedUsage.map(([component, count]) => [component, count]);

    let content = 'Component Usage Across the Application:\n';
    content += '---------------------------------------\n';
    content += createTable(usageHeaders, usageRows, [60, 15]) + '\n';

    generateCSV('component-usage', usageHeaders, usageRows, exportDir, dateString);

    return content;
}

function generateDependenciesSection(components, dependencies, exportDir, dateString) {
    const sortedComponents = components.sort((a, b) =>
        (dependencies[b] ? dependencies[b].length : 0) - (dependencies[a] ? dependencies[a].length : 0)
    );

    const depHeaders = ['Component', 'Dependency Count', 'Dependencies'];
    const depRows = sortedComponents.map(component => {
        const deps = dependencies[component] || [];
        const sortedDeps = deps.sort((a, b) => a.localeCompare(b));
        return [component, deps.length, sortedDeps.join(', ')];
    });

    let content = `Total components found: ${components.length}\n\n`;
    content += 'Components and their dependencies (sorted by number of dependencies):\n';
    content += '------------------------------------------------------------------------\n';
    content += createTable(depHeaders, depRows, [30, 20, 50]);

    generateCSV('component-dependencies', depHeaders, depRows, exportDir, dateString);

    return content;
}

function generateEventsAnalysisSection(publishedEvents, eventSubscriptions, exportDir, dateString) {
    const eventAnalysis = analyzeEvents(publishedEvents, eventSubscriptions);
    const eventHeaders = ['Event', 'Times Published', 'Times Subscribed', 'Published In', 'Subscribed In'];
    const eventRows = eventAnalysis.map(({ event, publishCount, subscribeCount, publishedFiles, subscribedFiles }) =>
        [event, publishCount, subscribeCount, publishedFiles, subscribedFiles]);

    let content = '\nEvents Analysis:\n';
    content += '----------------\n';
    content += createTable(eventHeaders, eventRows, [50, 20, 20, 30, 30]);

    generateCSV('events-analysis', eventHeaders, eventRows, exportDir, dateString);

    return content;
}

function generateEventSubscriptionsSection(eventSubscriptions) {
    let content = '\nEvent Subscriptions and Lambda Functions:\n';
    content += '----------------------------------------\n';
    Object.entries(eventSubscriptions).forEach(([event, subscriptions]) => {
        content += `${event}:\n`;
        subscriptions.forEach(sub => {
            content += `  - ${sub.component} (${sub.file}):\n`;
            content += `    ${sub.handler.split('\n').map(line => '    ' + line).join('\n')}\n\n`;
        });
    });
    return content;
}

function generateCSV(name, headers, rows, exportDir, dateString) {
    const csv = createCSV(headers, rows);
    const fileName = path.join(exportDir, `${name}-${dateString}.csv`);
    fs.writeFileSync(fileName, csv);
    return fileName;
}

function writeReportToFile(reportContent, exportDir, dateString) {
    const reportFileName = path.join(exportDir, `aurelia-app-report-${dateString}.txt`);
    fs.writeFileSync(reportFileName, reportContent);
    return reportFileName;
}

function logReportGeneration(componentCount, reportFileName) {
    console.log(`\n${COLORS.FgGreen}Total components found: ${componentCount}${COLORS.Reset}`);
    console.log(`Report generated: ${COLORS.FgCyan}${reportFileName}${COLORS.Reset}`);
    console.log(`CSV files generated in the same directory.`);
}

function analyzeEvents(publishedEvents, eventSubscriptions) {
    const eventAnalysis = [];
    const allEvents = new Set([...Object.keys(publishedEvents), ...Object.keys(eventSubscriptions)]);

    allEvents.forEach(event => {
        const publishCount = publishedEvents[event] ? publishedEvents[event].count : 0;
        const publishedFiles = publishedEvents[event] ? Array.from(publishedEvents[event].files).join(', ') : '';
        const subscribeCount = eventSubscriptions[event] ? eventSubscriptions[event].length : 0;
        const subscribedFiles = eventSubscriptions[event] ?
            [...new Set(eventSubscriptions[event].map(sub => sub.file))].join(', ') : '';
        eventAnalysis.push({ event, publishCount, subscribeCount, publishedFiles, subscribedFiles });
    });

    return eventAnalysis.sort((a, b) => b.publishCount + b.subscribeCount - (a.publishCount + a.subscribeCount));
}

module.exports = { generateReport };
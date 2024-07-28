const fs = require('fs');
const path = require('path');
const { COLORS, createTable } = require('./utils');
const { detectCircularDependencies } = require('./dependencyAnalyzer');

function generateReport(components, dependencies, componentUsage, publishedEvents, eventSubscriptions, exportDir, dateString) {
    let reportContent = 'Aurelia Application Analysis Report\n';
    reportContent += '===================================\n\n';

    const circularDeps = detectCircularDependencies(dependencies);
    if (circularDeps.length > 0) {
        reportContent += `${COLORS.FgRed}Circular Dependencies Detected:\n`;
        reportContent += '--------------------------------\n';
        circularDeps.forEach(cycle => {
            reportContent += cycle.join(' -> ') + ' -> ' + cycle[0] + '\n';
        });
        reportContent += `${COLORS.Reset}\n`;
    } else {
        reportContent += `${COLORS.FgGreen}No circular dependencies detected.\n\n${COLORS.Reset}`;
    }

    reportContent += 'Component Usage Across the Application:\n';
    reportContent += '---------------------------------------\n';
    const sortedUsage = Object.entries(componentUsage)
        .sort((a, b) => b[1] - a[1]);
    const usageHeaders = ['Component', 'Usage Count'];
    const usageRows = sortedUsage.map(([component, count]) => [component, count]);
    reportContent += createTable(usageHeaders, usageRows, [60, 15]);
    reportContent += '\n';

    const sortedComponents = components.sort((a, b) => {
        return (dependencies[b] ? dependencies[b].length : 0) - (dependencies[a] ? dependencies[a].length : 0);
    });

    reportContent += `Total components found: ${components.length}\n\n`;
    reportContent += 'Components and their dependencies (sorted by number of dependencies):\n';
    reportContent += '------------------------------------------------------------------------\n';

    const depHeaders = ['Component', 'Dependency Count', 'Dependencies'];
    const depRows = sortedComponents.map(component => {
        const deps = dependencies[component] || [];
        const sortedDeps = deps.sort((a, b) => a.localeCompare(b));
        return [component, deps.length, sortedDeps.join(', ')];
    });
    reportContent += createTable(depHeaders, depRows, [30, 20, 50]);

    reportContent += '\nEvents Analysis:\n';
    reportContent += '----------------\n';
    const eventAnalysis = analyzeEvents(publishedEvents, eventSubscriptions);
    const eventHeaders = ['Event', 'Times Published', 'Times Subscribed', 'Published In', 'Subscribed In'];
    const eventRows = eventAnalysis.map(({ event, publishCount, subscribeCount, publishedFiles, subscribedFiles }) =>
        [event, publishCount, subscribeCount, publishedFiles, subscribedFiles]);
    reportContent += createTable(eventHeaders, eventRows, [50, 20, 20, 30, 30]);

    reportContent += '\nEvent Subscriptions and Call Chains:\n';
    reportContent += '-------------------------------------\n';
    Object.entries(eventSubscriptions).forEach(([event, subscriptions]) => {
        reportContent += `${event}:\n`;
        subscriptions.forEach(sub => {
            reportContent += `  - ${sub.component}: ${sub.handler}\n`;
            if (sub.chain && sub.chain.length > 0) {
                sub.chain.forEach(step => {
                    reportContent += `    ${step}\n`;
                });
            }
        });
    });

    const reportFileName = path.join(exportDir, `aurelia-app-report-${dateString}.txt`);
    fs.writeFileSync(reportFileName, reportContent);

    console.log(`\n${COLORS.FgGreen}Total components found: ${components.length}${COLORS.Reset}`);
    console.log(`Report generated: ${COLORS.FgCyan}${reportFileName}${COLORS.Reset}`);
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
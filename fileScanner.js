const fs = require('fs');
const path = require('path');
const { normalizeComponentName, analyzeComponent } = require('./utils');

function scanDirectory(directory) {
    const components = [];
    const dependencies = {};
    const componentUsage = {};
    const publishedEvents = {};
    const eventSubscriptions = {};
    const ignoredDirectories = ['node_modules', '.git', 'dist', 'build'];

    function scan(dir) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                if (!ignoredDirectories.includes(file)) {
                    scan(filePath);
                }
            } else if (file.endsWith('.js') || file.endsWith('.ts')) {
                const content = fs.readFileSync(filePath, 'utf-8');
                const { componentName, deps, events, subscriptions } = analyzeComponent(filePath, content);

                if (!components.includes(componentName)) {
                    components.push(componentName);
                }

                dependencies[componentName] = deps;
                deps.forEach(dep => {
                    componentUsage[dep] = (componentUsage[dep] || 0) + 1;
                });

                // Merge the events into publishedEvents
                Object.entries(events).forEach(([event, data]) => {
                    if (!publishedEvents[event]) {
                        publishedEvents[event] = { count: 0, files: new Set() };
                    }
                    publishedEvents[event].count += data.count;
                    data.files.forEach(file => publishedEvents[event].files.add(file));
                });

                // Merge the subscriptions
                Object.entries(subscriptions).forEach(([event, subs]) => {
                    if (!eventSubscriptions[event]) {
                        eventSubscriptions[event] = [];
                    }
                    eventSubscriptions[event].push(...subs);
                });
            }
        }
    }

    scan(directory);

    return { components, dependencies, componentUsage, publishedEvents, eventSubscriptions };
}

module.exports = { scanDirectory };
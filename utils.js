const path = require('path');

const COLORS = {
    Reset: "\x1b[0m",
    FgRed: "\x1b[31m",
    FgGreen: "\x1b[32m",
    FgYellow: "\x1b[33m",
    FgCyan: "\x1b[36m",
};

function createTable(headers, rows, columnWidths) {
    const maxWidths = columnWidths.map((w, i) =>
        Math.max(w, headers[i].length, ...rows.map(row => String(row[i]).length))
    );

    const createLine = () => '+' + maxWidths.map(w => '-'.repeat(w + 2)).join('+') + '+\n';
    const createRow = (cells) => '| ' + cells.map((cell, i) =>
        String(cell).padEnd(maxWidths[i])
    ).join(' | ') + ' |\n';

    let table = createLine();
    table += createRow(headers);
    table += createLine();
    rows.forEach(row => {
        table += createRow(row);
    });
    table += createLine();
    return table;
}

function normalizeComponentName(name) {
    return path.basename(name);
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractHandler(handlerString) {
    handlerString = handlerString.trim();

    if (handlerString.includes('=>')) {
        const arrowBody = handlerString.split('=>')[1].trim();
        if (arrowBody.startsWith('{')) {
            const match = arrowBody.match(/this\.(\w+)\(/);
            return match ? match[1] : 'ArrowFunction';
        } else {
            return arrowBody.replace(/[();]/g, '').trim();
        }
    }

    return handlerString.split('.').pop().replace(/[()]/g, '');
}

function analyzeCallChain(content, startMethod) {
    const callChain = [];

    function analyzeMethodBody(methodBody) {
        const methodCallRegex = /\bthis\.(\w+)\s*\([^)]*\)/g;
        let methodMatch;

        while ((methodMatch = methodCallRegex.exec(methodBody)) !== null) {
            const calledMethod = methodMatch[1];

            if (!callChain.includes(calledMethod) && !['if', 'forEach', 'map', 'filter', 'reduce', 'then', 'catch'].includes(calledMethod)) {
                callChain.push(calledMethod);

                const nestedMethodRegex = new RegExp(`(async\\s+)?${calledMethod}\\s*\\([^)]*\\)\\s*{([\\s\\S]*?)}`, 'g');
                let nestedMatch;
                while ((nestedMatch = nestedMethodRegex.exec(content)) !== null) {
                    analyzeMethodBody(nestedMatch[2]);
                }
            }
        }

        const publishRegex = /this\.eventAggregator\.publish\s*\(\s*([^)]+)\s*\)/g;
        let publishMatch;
        while ((publishMatch = publishRegex.exec(methodBody)) !== null) {
            const eventName = publishMatch[1].split(',')[0].trim().replace(/['"]/g, '');
            if (!callChain.includes(`Publishes: ${eventName}`)) {
                callChain.push(`Publishes: ${eventName}`);
            }
        }
    }

    if (startMethod.includes('=>')) {
        const arrowBody = startMethod.split('=>')[1].trim();
        analyzeMethodBody(arrowBody);
    } else {
        const methodRegex = new RegExp(`(async\\s+)?${startMethod}\\s*\\([^)]*\\)\\s*{([\\s\\S]*?)}`, 'g');
        let match = methodRegex.exec(content);
        if (match) {
            analyzeMethodBody(match[2]);
        }
    }

    return callChain;
}

function analyzeComponent(filePath, content) {
    const componentName = normalizeComponentName(path.basename(filePath, path.extname(filePath)));
    const fileName = path.basename(filePath);
    const importRegex = /import.*from\s+['"](.+)['"]/g;
    const deps = [];
    const publishedEvents = {};
    const eventSubscriptions = {};

    let match;
    while ((match = importRegex.exec(content)) !== null) {
        deps.push(normalizeComponentName(match[1]));
    }

    const publishRegex = /\.publish\s*\(\s*([^)]+)\s*\)/g;
    while ((match = publishRegex.exec(content)) !== null) {
        const eventName = match[1].trim().replace(/['"]/g, '');
        if (!publishedEvents[eventName]) {
            publishedEvents[eventName] = { count: 0, files: new Set() };
        }
        publishedEvents[eventName].count++;
        publishedEvents[eventName].files.add(fileName);
    }

    const subscribeRegex = /\.subscribe\s*\(\s*([^,]+),\s*([^)]+)\)/g;
    while ((match = subscribeRegex.exec(content)) !== null) {
        const eventName = match[1].trim().replace(/['"]/g, '');
        const handler = extractHandler(match[2]);
        if (!eventSubscriptions[eventName]) {
            eventSubscriptions[eventName] = [];
        }
        const callChain = analyzeCallChain(content, handler);
        eventSubscriptions[eventName].push({
            component: componentName,
            handler: handler,
            chain: callChain.length > 0 ? callChain : [handler],
            file: fileName
        });
    }

    return { componentName, deps, events: publishedEvents, subscriptions: eventSubscriptions };
}

module.exports = {
    COLORS,
    createTable,
    normalizeComponentName,
    escapeRegExp,
    extractHandler,
    analyzeCallChain,
    analyzeComponent
};
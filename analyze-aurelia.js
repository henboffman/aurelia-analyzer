const fs = require('fs');
const path = require('path');

const COLORS = {
    Reset: "\x1b[0m",
    Bright: "\x1b[1m",
    Dim: "\x1b[2m",
    Underscore: "\x1b[4m",
    Blink: "\x1b[5m",
    Reverse: "\x1b[7m",
    Hidden: "\x1b[8m",

    FgBlack: "\x1b[30m",
    FgRed: "\x1b[31m",
    FgGreen: "\x1b[32m",
    FgYellow: "\x1b[33m",
    FgBlue: "\x1b[34m",
    FgMagenta: "\x1b[35m",
    FgCyan: "\x1b[36m",
    FgWhite: "\x1b[37m",
    FgGray: "\x1b[90m",

    BgBlack: "\x1b[40m",
    BgRed: "\x1b[41m",
    BgGreen: "\x1b[42m",
    BgYellow: "\x1b[43m",
    BgBlue: "\x1b[44m",
    BgMagenta: "\x1b[45m",
    BgCyan: "\x1b[46m",
    BgWhite: "\x1b[47m",
    BgGray: "\x1b[100m"
};

function analyzeAureliaApp(directory, focusComponent) {
    const components = [];
    const dependencies = {};
    const componentUsage = {};
    const ignoredDirectories = ['node_modules', '.git', 'dist', 'build'];
    const exportDir = 'exports';
    const currentDate = new Date();
    const dateString = `${currentDate.toLocaleString('default', { month: 'long' })}-${currentDate.getDate()}`;


    // Ensure export directory exists
    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir);
    }
    function scanDirectory(dir) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
                if (!ignoredDirectories.includes(file)) {
                    scanDirectory(filePath);
                }
            } else if (file.endsWith('.js') || file.endsWith('.ts')) {
                const content = fs.readFileSync(filePath, 'utf-8');
                analyzeComponent(filePath, content);
            }
        }
    }

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

    function analyzeComponent(filePath, content) {
        const componentName = normalizeComponentName(path.basename(filePath, path.extname(filePath)));
        if (!components.includes(componentName)) {
            components.push(componentName);
        }

        const importRegex = /import.*from\s+['"](.+)['"]/g;
        const deps = [];
        let match;

        while ((match = importRegex.exec(content)) !== null) {
            deps.push(normalizeComponentName(match[1]));
        }

        if (!dependencies[componentName]) {
            dependencies[componentName] = [];
        }
        dependencies[componentName] = [...new Set([...dependencies[componentName], ...deps])];

        // Count component usage
        deps.forEach(dep => {
            componentUsage[dep] = (componentUsage[dep] || 0) + 1;
        });
    }

    function detectCircularDependencies() {
        const circularDeps = [];

        function dfs(component, visited = new Set(), path = []) {
            if (visited.has(component)) {
                const cycleStart = path.indexOf(component);
                if (cycleStart !== -1) {
                    circularDeps.push(path.slice(cycleStart).concat(component));
                }
                return;
            }

            visited.add(component);
            path.push(component);

            const deps = dependencies[component] || [];
            for (const dep of deps) {
                dfs(dep, new Set(visited), [...path]);
            }

            path.pop();
        }

        for (const component of components) {
            dfs(component);
        }

        return circularDeps;
    }

    function generateReport() {
        let reportContent = 'Aurelia Application Analysis Report\n';
        reportContent += '===================================\n\n';

        // Detect and report circular dependencies
        const circularDeps = detectCircularDependencies();
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

        // Report component usage
        reportContent += 'Component Usage Across the Application:\n';
        reportContent += '---------------------------------------\n';
        const sortedUsage = Object.entries(componentUsage)
            .sort((a, b) => b[1] - a[1]);
        const usageHeaders = ['Component', 'Usage Count'];
        const usageRows = sortedUsage.map(([component, count]) => [component, count]);
        reportContent += createTable(usageHeaders, usageRows, [60, 15]);
        reportContent += '\n';

        // Sort components by number of dependencies
        const sortedComponents = components.sort((a, b) => {
            return (dependencies[b] ? dependencies[b].length : 0) - (dependencies[a] ? dependencies[a].length : 0);
        });

        reportContent += `Total components found: ${components.length}\n\n`;
        reportContent += 'Components and their dependencies (sorted by number of dependencies):\n';
        reportContent += '------------------------------------------------------------------------\n';

        const depHeaders = ['Component', 'Dependency Count', 'Dependencies'];
        const depRows = sortedComponents.map(component => {
            const deps = dependencies[component] || [];
            // Sort dependencies alphabetically
            const sortedDeps = deps.sort((a, b) => a.localeCompare(b));
            return [component, deps.length, sortedDeps.join(', ')];
        });
        reportContent += createTable(depHeaders, depRows, [30, 20, 50]);

        const reportFileName = path.join(exportDir, `aurelia-app-report-${dateString}.txt`);
        fs.writeFileSync(reportFileName, reportContent);

        console.log(`\n${COLORS.FgGreen}Total components found: ${components.length}${COLORS.Reset}`);
        console.log(`Report generated: ${COLORS.FgCyan}${reportFileName}${COLORS.Reset}`);
    }

    function generateFullDependencyGraph() {
        let dotContent = 'digraph AureliaAppDependencies {\n';
        dotContent += '  layout=dot;\n';
        dotContent += '  rankdir=LR;\n';
        dotContent += '  node [shape=box, style="rounded,filled", fillcolor=lightblue];\n';
        dotContent += '  edge [color=gray];\n';

        for (const [component, deps] of Object.entries(dependencies)) {
            const color = component === focusComponent ? "yellow" : "lightblue";
            dotContent += `  "${component}" [fillcolor=${color}];\n`;
            deps.forEach(dep => {
                dotContent += `  "${component}" -> "${dep}";\n`;
            });
        }

        dotContent += '}\n';

        const fullGraphFileName = path.join(exportDir, `aurelia-dependencies-${dateString}.dot`);
        fs.writeFileSync(fullGraphFileName, dotContent);
        console.log(`Full dependency graph DOT file generated:  ${fullGraphFileName} `);
    }

    function generateFocusedDependencyGraph(focusComponent) {
        let dotContent = 'digraph FocusedAureliaAppDependencies {\n';
        dotContent += '  layout=dot;\n';
        dotContent += '  rankdir=LR;\n';
        dotContent += '  node [shape=box, style="rounded,filled", fillcolor=lightblue];\n';
        dotContent += '  edge [color=gray];\n';

        const visited = new Set();
        const queue = [focusComponent];
        const relatedComponents = new Set();

        while (queue.length > 0) {
            const component = queue.shift();
            if (!visited.has(component)) {
                visited.add(component);
                relatedComponents.add(component);

                const deps = dependencies[component] || [];
                deps.forEach(dep => {
                    dotContent += `  "${component}" -> "${dep}";\n`;
                    queue.push(dep);
                });

                Object.entries(dependencies).forEach(([comp, compDeps]) => {
                    if (compDeps.includes(component) && !visited.has(comp)) {
                        dotContent += `  "${comp}" -> "${component}";\n`;
                        queue.push(comp);
                    }
                });
            }
        }

        relatedComponents.forEach(component => {
            dotContent += `  "${component}" [fillcolor=${component === focusComponent ? "yellow" : "lightblue"}];\n`;
        });

        dotContent += '}\n';

        const focusedGraphFileName = path.join(exportDir, `focused-aurelia-dependencies-${focusComponent}-${dateString}.dot`);
        fs.writeFileSync(focusedGraphFileName, dotContent);
        console.log(`Focused dependency graph DOT file generated:  ${focusedGraphFileName}`);
        console.log(`\nUse Graphviz to generate the graph image: ${COLORS.FgCyan} dot -Tpng ${focusedGraphFileName} -o focused-dependencies.png ${COLORS.Reset}`);
    }

    scanDirectory(directory);
    generateReport();
    generateFullDependencyGraph();

    if (focusComponent) {
        if (components.includes(normalizeComponentName(focusComponent))) {
            generateFocusedDependencyGraph(normalizeComponentName(focusComponent));
        } else {
            console.log(`\n${COLORS.FgYellow}Warning: Component "${focusComponent}" not found in the scanned files. Focused graph not generated.${COLORS.Reset}`);
        }
    }

    return { components, dependencies, componentUsage };
}

const aureliaAppDir = process.argv[2];
const focusComponent = process.argv[3];

if (!aureliaAppDir) {
    console.error('Please provide the Aurelia application directory as an argument.');
    process.exit(1);
}

analyzeAureliaApp(aureliaAppDir, focusComponent);
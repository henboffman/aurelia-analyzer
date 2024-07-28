const fs = require('fs');
const path = require('path');
const { COLORS } = require('./utils');

function generateFullDependencyGraph(dependencies, focusComponent, exportDir, dateString) {
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
    console.log(`Full dependency graph DOT file generated: ${fullGraphFileName}`);
}

function generateFocusedDependencyGraph(dependencies, focusComponent, exportDir, dateString) {
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
    console.log(`Focused dependency graph DOT file generated: ${focusedGraphFileName}`);
    console.log(`\nUse Graphviz to generate the graph image: ${COLORS.FgCyan} dot -Tpng ${focusedGraphFileName} -o focused-dependencies.png ${COLORS.Reset}`);
}

module.exports = { generateFullDependencyGraph, generateFocusedDependencyGraph };
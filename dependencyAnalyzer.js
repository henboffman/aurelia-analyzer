function detectCircularDependencies(dependencies) {
    const circularDeps = new Set();

    function dfs(component, visited = new Set(), path = []) {
        if (visited.has(component)) {
            const cycleStart = path.indexOf(component);
            if (cycleStart !== -1) {
                const cycle = path.slice(cycleStart).concat(component);
                circularDeps.add(cycle.join(' -> '));
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

    for (const component of Object.keys(dependencies)) {
        dfs(component);
    }

    return Array.from(circularDeps);
}

module.exports = { detectCircularDependencies };
function detectCircularDependencies(dependencies) {
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

    for (const component of Object.keys(dependencies)) {
        dfs(component);
    }

    return circularDeps;
}

module.exports = { detectCircularDependencies };
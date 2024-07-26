# Aurelia Analyzer

This tool generates a report to view component dependencies within your Aurelia application. It probably would work with other frameworks as well but I have not tested this.

## Usage

From the `aurelia-analyzer` directory, simply run the command

```
node analyze-aurelia.js /path/to/aurelia/app 
```

### Optional: Focus on a specific component

You can optionally specify the name of a single route or component in your application. This component will be highlighted if you generate a graph visualization using the provided `focused_aurelia_component.dot` file.

```
node analyze-aurelia.js /path/to/aurelia/app component_name
```

Example:

```
node analyze-aurelia.js /path/to/aurelia/app home
```

## Visualizing

**Note: visualization requires the [GraphViz](https://graphviz.org/) library**

After you have run the report, you can run the following commands to generate `.png` files containing a visual representation of your dependency graph. To generate the files, run

```
dot -Tpng -Gdpi=300 aurelia_dependencies.dot -o aurelia_dependencies.png

dot -Tpng -Gdpi=300 focused_aurelia_dependencies.dot -o focused_aurelia_dependencies.png
```

# Aurelia Analyzer

This tool generates a report to view component dependencies within your Aurelia application. It probably would work with other frameworks as well but I have not tested this.

## Features

- Analyzes component dependencies
- Detects circular dependencies
- Tracks event publishing and subscriptions
- Generates a full dependency graph
- Creates a focused dependency graph for a specific component
- Produces a detailed report including component usage and event analysis

## Installation

1. Clone this repository:

```
git clone https://github.com/henboffman/aurelia-analyzer.git
```

2. Navigate to the project directory:

```
cd aurelia-analyzer
```

3. Install dependencies:

```
npm install
```

## Usage

From the `aurelia-analyzer` directory, simply run the command

```
node main.js /path/to/aurelia/app 
```

### Parameters

- `/path/to/aurelia/app`: The path to your Aurelia application's root directory (required)
- `focus_component`: Name of a specific component to focus on (optional)

### Optional: Focus on a specific component

You can optionally specify the name of a single route or component in your application. This component will be highlighted if you generate a graph visualization using the provided `focused_aurelia_component.dot` file.

```
node analyze-aurelia.js /path/to/aurelia/app component_name
```

### Example

```
node analyze-aurelia.js /path/to/aurelia/app home
```

## Output

The analyzer generates several files in the `exports` directory:

1. `aurelia-app-report-[date].txt`: A detailed text report of the analysis
2. `aurelia-dependencies-[date].dot`: A DOT file for the full dependency graph
3. `focused-aurelia-dependencies-[component]-[date].dot`: A DOT file for the focused dependency graph (if a focus component was specified)

## Visualizing

**Note: visualization requires the [GraphViz](https://graphviz.org/) library**

After you have run the report, you can run the following commands to generate `.png` files containing a visual representation of your dependency graph. To generate the files, run

```
dot -Tpng -Gdpi=300 exports/[month]-[day]/aurelia-dependencies-[month]-[day].dot -o aurelia_dependencies.png

dot -Tpng -Gdpi=300 exports/[month]-[day]/focused-aurelia-dependencies-[component]-[month]-[day].dot -o focused_aurelia_dependencies.png
```

Replace `[date]` and `[component]` with the actual values from the generated file names.

## Report Contents

The generated report includes:

- Circular dependency detection
- Component usage across the application
- Components and their dependencies
- Event analysis (publishing and subscription)
- Event subscriptions and call chains

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This tool is provided as-is, without any guarantees or warranty. The authors are not responsible for any damage or data loss that may occur from using this tool.

## TODO

- look for event circularity
  - build a log of how one event can trigger another event, and output the event chains present
- check for multi-level nesting/referencing of services
- in the hierarchy report, denote methods with ()

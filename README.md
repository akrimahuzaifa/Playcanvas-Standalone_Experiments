# Playcanvas-Standalone Experiments

This project demonstrates a minimal standalone setup for using the [PlayCanvas](https://playcanvas.com/) WebGL engine with TypeScript and [Vite](https://vitejs.dev/) as the build tool.

## Features

- Renders a rotating 3D box using PlayCanvas.
- Includes a camera and a directional light.
- Uses TypeScript for type safety and modern development.
- Fast development with Vite.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or newer recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. Clone this repository:
    ```sh
    git clone <repo-url>
    cd Playcanvas-Standalone_Experiments
    ```

2. Install dependencies:
    ```sh
    npm install
    ```

### Running the Project

Start the development server:
```sh
npx vite
```
hen open http://localhost:5173 in your browser.

### Building for Production
To build the project:
```sh
npx vite build
```

### Project Structure
- `main.ts` — Main entry point, sets up PlayCanvas scene.
- `index.html` — Loads the canvas and script.
- `package.json` — Project dependencies.

### License
This project is for experimental and educational purposes.
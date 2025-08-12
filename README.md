# Game Launcher

A modern game launcher built with Electron, React, and TypeScript. This application allows you to detect and launch Steam games, as well as add custom games to your library with a beautiful, animated interface.

## Features

- **Steam Game Detection**: Automatically scans and detects games from your Steam library
- **Custom Game Support**: Add any game to your library by selecting its folder
- **Modern UI**: Beautiful, responsive interface with smooth animations using Framer Motion
- **Search & Filter**: Find games quickly with real-time search and type filtering
- **Cross-Platform**: Works on Windows, macOS, and Linux
- **TypeScript**: Full type safety and better development experience

## Tech Stack

- **Electron**: Cross-platform desktop application framework
- **React 18**: Modern UI library with hooks
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Beautiful, accessible component library
- **Framer Motion**: Production-ready motion library for React
- **Vite**: Fast build tool and development server

## Installation

### Prerequisites
- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js)

### Quick Start

1. **Clone the repository:**
```bash
git clone https://github.com/YOUR_USERNAME/game-launcher.git
cd game-launcher
```

2. **Install dependencies:**
```bash
npm install
```

3. **Start the development server:**
```bash
npm run dev
```

The app will open automatically in Electron with hot reload enabled.

### Alternative Installation Methods

#### Using GitHub CLI
```bash
gh repo clone YOUR_USERNAME/game-launcher
cd game-launcher
npm install
npm run dev
```

#### Download ZIP
1. Click the green "Code" button on GitHub
2. Select "Download ZIP"
3. Extract and navigate to the folder
4. Run `npm install` and `npm run dev`

## Development

The app uses a modern development setup with:
- **Vite** for fast development and building
- **Hot Module Replacement** for instant updates
- **TypeScript** for type safety
- **ESLint** and **Prettier** for code quality

### Development Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Build Electron app
npm run build:electron

# Preview production build
npm run preview
```

## Project Structure

```
GameLauncher/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── GameLauncher.tsx
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── GameGrid.tsx
│   │   ├── GameCard.tsx
│   │   ├── AddGameDialog.tsx
│   │   └── LoadingOverlay.tsx
│   ├── types/              # TypeScript type definitions
│   ├── lib/                # Utility functions
│   ├── main.js             # Electron main process
│   ├── preload.js          # Electron preload script
│   ├── App.tsx             # Main React app
│   ├── main.tsx            # React entry point
│   └── index.css           # Global styles
├── assets/                 # Static assets
├── dist/                   # Built files
├── package.json
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── tsconfig.json           # TypeScript configuration
└── README.md
```

## How It Works

### Steam Game Detection
The app automatically detects Steam games by:
1. Finding Steam installation paths based on your operating system
2. Parsing the `libraryfolders.vdf` file to locate game libraries
3. Reading `.acf` files to extract game information
4. Finding executable files within game directories

### Custom Games
You can add any game to your library by:
1. Clicking "Add Game" in the header
2. Entering the game name
3. Selecting the game folder using the file browser
4. The app will attempt to find the executable automatically

### Modern UI Features
- **Smooth Animations**: Powered by Framer Motion
- **Responsive Design**: Works on all screen sizes
- **Glassmorphism**: Beautiful backdrop blur effects
- **Dark Mode Ready**: Built with shadcn/ui design system
- **Accessible**: WCAG compliant components

## Building for Distribution

To build the application for distribution:

```bash
# Build the React app
npm run build

# Build the Electron app
npm run build:electron
```

The built application will be available in the `dist` directory.

## Supported Platforms

- **Windows**: Steam detection works with default Steam installation
- **macOS**: Steam detection works with default Steam installation  
- **Linux**: Steam detection works with default Steam installation

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure all tests pass
5. Submit a pull request

## Troubleshooting

### No Steam Games Found
- Make sure Steam is installed in the default location
- Ensure you have games installed in your Steam library
- Check that the Steam client is properly configured

### Games Won't Launch
- Verify the game executable exists in the specified path
- Check that you have the necessary permissions to run the game
- For custom games, make sure the path points to the correct game folder

### App Won't Start
- Ensure Node.js is installed (version 16 or higher recommended)
- Check that all dependencies are installed with `npm install`
- Verify that Electron is properly installed

### Development Issues
- Clear the `node_modules` folder and run `npm install` again
- Make sure you're using the correct Node.js version
- Check that all TypeScript types are properly installed

## License

MIT License - see LICENSE file for details

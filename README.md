# React Three Fiber Arena Shooter

A fast-paced, 3D web-based arena shooter built with React, Three.js, and `@react-three/fiber`. This project demonstrates how to build a fully functional first-person shooter (FPS) game running entirely in the browser, complete with AI opponents, power-ups, and team-based scoring.

## 🎮 Features

- **3D Graphics & Rendering:** Built on top of Three.js and React Three Fiber for performant, declarative 3D scenes.
- **Advanced AI Opponents:** Features different classes of AI enemies (Aggressive, Tactical, Sniper) with dynamic difficulty, pathfinding, obstacle avoidance, and state-machine-based behaviors (patrol, chase, flank, seek cover, attack).
- **Power-Up System:** Collectible power-ups including Speed Boost, Rapid Fire, and Shields to gain a tactical advantage.
- **Team-Based Combat:** Join Team A or Team B and compete for the highest score.
- **Spectator Mode:** Watch the action unfold from the perspective of different AI units.
- **Dynamic UI:** Heads-Up Display (HUD) showing health, active power-ups, a real-time mini-map, and team scores.

## 🛠️ Tech Stack

- **[React](https://reactjs.org/)** - UI framework
- **[Three.js](https://threejs.org/)** - 3D library
- **[React Three Fiber](https://docs.pmnd.rs/react-three-fiber/getting-started/introduction)** - React renderer for Three.js
- **[React Three Drei](https://github.com/pmndrs/drei)** - Useful helpers for React Three Fiber
- **[Zustand](https://github.com/pmndrs/zustand)** - Lightweight state management
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework for the HUD and menus

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Make sure you have Node.js installed on your machine.

### Installation

1. Fork and clone the repository:
   ```sh
   git clone https://github.com/your_username/repo_name.git
   ```
2. Navigate to the project directory:
   ```sh
   cd repo_name
   ```
3. Install NPM packages:
   ```sh
   npm install
   ```
4. Start the development server:
   ```sh
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:3000` (or the port provided in your terminal).

## 🕹️ Controls

- **W, A, S, D**: Move
- **Mouse**: Look around
- **Left Click**: Shoot
- **Esc**: Release mouse pointer / Pause

## 🤝 Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is open-source and available under the **MIT License**. See the `LICENSE` file for more information. Feel free to fork, modify, and use this code in your own projects!

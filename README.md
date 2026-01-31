<div align="center">

![Lost-Link Banner](assets/banner.png)

# 🔗 Lost-Link
### **Secure • Decentralized • Zero-Config Offline Messaging**

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9)](https://www.electronjs.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)

---

**Lost-Link** is a production-ready, peer-to-peer messaging suite designed for seamless communication on local networks without internet dependencies.

[**Documentation**](docs/index.md) • [**Getting Started**](#-quick-start) • [**Architecture**](#-system-architecture) • [**Community**](https://twitter.com/Not_Shubham_111)

</div>

---

<div align="center">

# 👨‍💻 Developed by **Shubham Kambli**
### *The Architect behind the Mesh*

**Founder of [COSMIC](https://shubham-plum.vercel.app) • AI Engineer • Open-Source Builder**

---

> "I build high-performance systems that bridge the gap between artificial intelligence and software engineering. 19-year-old founder, engineer, and builder creating production-ready tools for the future of decentralized computing."

### 🤝 **Let's Connect & Build**

| 🌐 **Website** | 📧 **Email** | 💼 **LinkedIn** | 🐦 **Twitter** | 👾 **Discord** |
|:---:|:---:|:---:|:---:|:---:|
| [**shubham-plum.vercel.app**](https://shubham-plum.vercel.app) | [**shubhamkambli1112@gmail.com**](mailto:shubhamkambli1112@gmail.com) | [**LinkedIn Profile**](https://linkedin.com/in/shubham-kambli-720650339) | [**@Not_Shubham_111**](https://twitter.com/Not_Shubham_111) | [**Discord Community**](https://discord.gg/XA3ctdYZ) |

<br>

**[🚀 Wiki Home](https://github.com/NotShubham111/Lost-Link/wiki) • [🔍 View Full Portfolio](https://shubham-plum.vercel.app)**

</div>

---

## 🎯 Project Overview

### The Mission
In a world of constant connectivity, **Lost-Link** provides a secure, private, and resilient communication bridge for environments where the internet is a luxury or a security risk. Whether it's a remote research station, a secure office, or a local community event, Lost-Link ensures your words travel only as far as they need to.

### 💎 Key Features

| Feature | Aesthetic | Description |
|:---|:---:|:---|
| **📡 Peer Discovery** | `📶` | Instant, zero-config detection of users on your subnet using UDP. |
| **🔒 E2EE Security** | `🔐` | Hardened privacy with ECDH key exchange and AES-GCM 256-bit encryption. |
| **⚡ High Performance** | `🚀` | Ultra-responsive UI powered by Electron-Vite and React concurrency. |
| **🛡️ Privacy First** | `👤` | Zero telemetry. Zero cloud. Zero tracking. Just pure decentralized chat. |
| **🎨 Premium Design** | `✨` | Glassmorphic UI with smooth animations and intuitive navigation. |

---

## 🏗️ System Architecture

Lost-Link's engine is built on a custom P2P stack that bridges human interaction with robust network protocols.

```mermaid
graph TD
    subgraph "The Frontend (React)"
        UI[Interactive Dashboard]
        Theme[Dynamic Theme Engine]
    end

    subgraph "The Bridge (Electron Preload)"
        IPC[Secure IPC Layer]
    end

    subgraph "The Core (Node.js)"
        UDP[Discovered Service]
        Crypto[Encryption Engine]
        Net[P2P Direct Sockets]
    end

    UI <--> IPC
    IPC <--> UDP
    UDP <--> Net
    Net <--> Crypto
```

---

## 📂 Repository Structure

```bash
lost-link/
├── 📁 assets/                # README visual resources & branding
├── 📁 src/                   # Main Application Source
│   ├── 📁 main/             # Electron Main Process Logic
│   ├── 📁 preload/          # Security-hardened IPC Bridges
│   └── 📁 renderer/         # React Frontend Core
├── 📁 resources/             # Build icons and static assets
├── 📁 legacy_src/            # Prototype archival scripts
└── package.json              # Project manifests & dependencies
```

---

## 🚀 Quick Start

### 1️⃣ Installation
```bash
# Clone the vision
git clone https://github.com/NotShubham111/Lost-Link.git && cd lost-link

# Install the engine
npm install
```

### 2️⃣ Running Locally
```bash
# Launch development environment
npm run dev
```

### 3️⃣ Packaging
```bash
# Build production executables
npm run build
```

> [!IMPORTANT]
> **Firewall Configuration:** Ensure your local network allows **UDP Broadcasts** on port 5000 (default) for peer discovery to function correctly.

---

## 📄 License
Licensed under the **MIT License**. Build, modify, and share freely!

---

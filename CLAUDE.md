# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A desktop Pomodoro Timer application built with Electron. Features a 25+5 minute work cycle with a 15-minute long break after every 2 pomodoros.

## Commands

```bash
cd src
npm install        # Install dependencies
npm start          # Run the app in development
npm run build      # Build Windows executable
```

## Architecture

**Electron Main Process** (`main.js`): Creates the application window and handles system notifications via the Notification API.

**Renderer Process** (`renderer.js`): Runs in the web page and manages:
- Timer state machine (work → short break → work → ... → long break after 2 pomodoros)
- UI updates and circular progress ring animation
- Settings modal for customizing durations
- Desktop notifications via IPC

**State Flow**:
- `work` (25 min default) → `shortBreak` (5 min) → `work` → `shortBreak` → ... → `longBreak` (15 min) → repeat

## Tech Stack

- Electron 28
- Vanilla HTML/CSS/JS (no frontend framework)
- electron-builder for packaging
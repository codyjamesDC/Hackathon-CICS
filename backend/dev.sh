#!/bin/bash
echo "Setting up adb reverse..."
adb reverse tcp:3000 tcp:3000
echo "Starting backend..."
cd backend && npm run dev

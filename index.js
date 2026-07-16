// Modern Expo entry point (SDK 49+): `registerRootComponent` wires the
// exported App component to the native runtime and ensures the environment
// (Metro, Expo Go, dev-client) all agree on the entry regardless of
// package.json `main` shape.
import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);

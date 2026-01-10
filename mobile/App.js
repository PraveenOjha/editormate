import React from 'react';
import Main from './app/index';

// App.js now delegates to the TypeScript entry under `app/index.tsx`.
export default function App() {
  return React.createElement(Main, null);
}

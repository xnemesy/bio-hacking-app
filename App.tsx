// Entry point principale: monta il layout con navigazione
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import RootLayout from './app/_layout';

export default function App(): React.JSX.Element {
  return (
    <>
      <RootLayout />
      <StatusBar style="light" backgroundColor="#1A1A1A" />
    </>
  );
}

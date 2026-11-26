import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-800.css';
import '@fontsource-variable/dm-sans';
import './visual.css';

export const metadata: Metadata = {
  title: 'Dicionário de Libras',
  description: 'Acervo colaborativo de verbetes e variações da Língua Brasileira de Sinais.',
};

export default function Estrutura({ children }: { children: ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}

import type { NextConfig } from 'next';

const configuracao: NextConfig = {
  devIndicators: false,
  agentRules: false,
  experimental: { proxyClientMaxBodySize: '55mb' },
  async rewrites() {
    return [{
      source: '/api/:caminho*',
      destination: 'http://127.0.0.1:3001/api/:caminho*',
    }];
  },
};

export default configuracao;

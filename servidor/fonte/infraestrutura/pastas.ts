import { resolve } from 'node:path';

export const pastaDados = resolve(process.env.PASTA_DADOS || resolve(__dirname, '../../dados'));
export const pastaMidias = resolve(pastaDados, 'midias');

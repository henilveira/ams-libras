import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function protegerSenha(senha: string) {
  const sal = randomBytes(16).toString('hex');
  return `${sal}:${scryptSync(senha, sal, 64).toString('hex')}`;
}

export function conferirSenha(senha: string, protegida: string) {
  const [sal, resumo] = protegida.split(':');
  return timingSafeEqual(scryptSync(senha, sal, 64), Buffer.from(resumo, 'hex'));
}

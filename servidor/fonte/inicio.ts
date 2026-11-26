import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ModuloAplicacao } from './modulo-aplicacao';
import { FiltroDominio } from './apresentacao/filtro-dominio';

async function iniciar() {
  const aplicativo = await NestFactory.create(ModuloAplicacao);
  aplicativo.setGlobalPrefix('api');
  aplicativo.useGlobalFilters(new FiltroDominio());
  await aplicativo.listen(3001, '127.0.0.1');
}

void iniciar();

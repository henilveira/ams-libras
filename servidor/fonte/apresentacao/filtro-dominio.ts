import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { ErroDeDominio } from '../acervo/dominio/envio';

@Catch(ErroDeDominio)
export class FiltroDominio implements ExceptionFilter {
  catch(erro: ErroDeDominio, contexto: ArgumentsHost) {
    contexto.switchToHttp().getResponse<Response>().status(422).json({ message: erro.message });
  }
}

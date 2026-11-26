import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { promisify } from 'node:util';
import { ErroDeDominio } from '../acervo/dominio/envio';
import type { TipoMidia } from '../acervo/dominio/verbete';
import type { Midia } from '../acervo/aplicacao/repositorio-acervo';
import { pastaMidias } from './pastas';

const executar = promisify(execFile);
export const limiteVideo = 50 * 1024 * 1024;

interface Formato {
  extensao: string;
  formato: string;
}

@Injectable()
export class Arquivos {
  private readonly logger = new Logger(Arquivos.name);

  async guardar(tipo: TipoMidia, arquivo: Express.Multer.File, autorId: string): Promise<Midia> {
    const formatos = this.identificar(tipo, arquivo);
    const midia = { ...formatos, id: randomUUID(), tipo, autorId, nome: basename(arquivo.originalname) };
    await mkdir(pastaMidias, { recursive: true, mode: 0o700 });
    const pasta = await mkdtemp(join(pastaMidias, 'envio-'));
    try {
      const entrada = join(pasta, `original.${midia.extensao}`);
      await writeFile(entrada, arquivo.buffer, { mode: 0o600 });
      const final = tipo === 'video' ? await this.validarVideo(entrada, pasta, midia.extensao) : entrada;
      await rename(final, this.caminho(midia));
      return midia;
    } finally {
      await rm(pasta, { recursive: true, force: true });
    }
  }

  caminho(midia: Midia) {
    return join(pastaMidias, `${midia.id}.${midia.extensao}`);
  }

  private identificar(tipo: TipoMidia, { originalname, buffer, size }: Express.Multer.File): Formato {
    if (!size) throw new ErroDeDominio('O arquivo está vazio.');
    const ext = extname(originalname).toLowerCase();
    if (tipo === 'video') {
      if (ext === '.mp4' && buffer.subarray(4, 8).toString() === 'ftyp') return { extensao: 'mp4', formato: 'video/mp4' };
      if (ext === '.webm' && buffer.subarray(0, 4).toString('hex') === '1a45dfa3') return { extensao: 'webm', formato: 'video/webm' };
      throw new ErroDeDominio('Selecione um vídeo MP4/H.264 ou WebM.');
    }
    if (tipo === 'autorizacao' && size <= 5 * 1024 * 1024 && ext === '.pdf'
      && buffer.subarray(0, 5).toString() === '%PDF-') {
      return { extensao: 'pdf', formato: 'application/pdf' };
    }
    if (tipo === 'legenda' && size <= 256 * 1024 && ext === '.vtt'
      && /^\uFEFF?WEBVTT(?:[ \t\r\n]|$)/.test(buffer.toString('utf8'))) {
      return { extensao: 'vtt', formato: 'text/vtt; charset=utf-8' };
    }
    if (tipo === 'imagem' && size <= 5 * 1024 * 1024) {
      if (ext === '.png' && buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
        return { extensao: 'png', formato: 'image/png' };
      }
      if (['.jpg', '.jpeg'].includes(ext) && buffer.subarray(0, 3).toString('hex') === 'ffd8ff') {
        return { extensao: 'jpg', formato: 'image/jpeg' };
      }
      if (ext === '.webp' && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') {
        return { extensao: 'webp', formato: 'image/webp' };
      }
    }
    const instrucoes = {
      imagem: 'Selecione uma imagem PNG, JPEG ou WebP de até 5 MB.',
      autorizacao: 'Selecione um comprovante PDF de até 5 MB.',
      legenda: 'Selecione uma legenda WebVTT de até 256 KB.',
    };
    throw new ErroDeDominio(instrucoes[tipo]);
  }

  private async validarVideo(entrada: string, pasta: string, extensao: string) {
    const mp4 = extensao === 'mp4';
    try {
      const { stdout } = await executar('ffprobe', [
        '-v', 'error', '-protocol_whitelist', 'file', '-show_streams', '-show_format', '-of', 'json', entrada,
      ], { timeout: 15_000, maxBuffer: 256 * 1024 });
      const dados = JSON.parse(stdout) as {
        streams: { codec_type: string; codec_name: string; duration?: string; disposition?: { attached_pic?: number } }[];
        format: { duration?: string; format_name: string };
      };
      const video = dados.streams.find((fluxo) => fluxo.codec_type === 'video');
      const duracao = Number(dados.format.duration ?? video?.duration);
      const formato = dados.format.format_name.split(',').includes(extensao);
      const codecs = mp4 ? ['h264'] : ['vp8', 'vp9', 'av1'];
      if (!formato || !video || video.disposition?.attached_pic || !codecs.includes(video.codec_name)) {
        throw new ErroDeDominio('O vídeo precisa estar em MP4/H.264 ou WebM.');
      }
      if (!Number.isFinite(duracao) || duracao <= 0 || duracao > 60) {
        throw new ErroDeDominio('O vídeo precisa ter duração de até 60 segundos.');
      }
      const saida = join(pasta, `video.${extensao}`);
      await executar('ffmpeg', [
        '-nostdin', '-v', 'error', '-protocol_whitelist', 'file', '-i', entrada,
        '-map', '0:v:0', '-map', '0:a:0?', '-map_metadata', '-1', '-map_metadata:s', '-1',
        '-map_chapters', '-1', '-c:v', 'copy', '-c:a', mp4 ? 'aac' : 'libopus',
        ...(mp4 ? ['-movflags', '+faststart'] : []), saida,
      ], { timeout: 30_000, maxBuffer: 256 * 1024 });
      return saida;
    } catch (erro) {
      if (erro instanceof ErroDeDominio) throw erro;
      if ((erro as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.error('FFmpeg ou ffprobe não encontrado.');
        throw new ServiceUnavailableException('O servidor precisa de FFmpeg e ffprobe para validar vídeos.');
      }
      throw new ErroDeDominio('Não foi possível processar o vídeo. Exporte o arquivo novamente em MP4/H.264 ou WebM.');
    }
  }
}

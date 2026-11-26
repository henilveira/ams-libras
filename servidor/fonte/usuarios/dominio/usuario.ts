export type Perfil = 'colaborador' | 'moderador' | 'administrador';

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  ativo: boolean;
}

export interface Conta extends Usuario {
  senhaProtegida: string;
}

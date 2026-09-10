import type { ContratacaoNotificacaoDto, OfertasRequestDto, OfertasResponseDto } from "./dto/index.js";

/** Motor de crédito: Atlas pede ofertas para um servidor. */
export interface OfertasService {
  gerar(request: OfertasRequestDto): Promise<OfertasResponseDto> | OfertasResponseDto;
}

/** Atlas notifica que uma oferta virou contrato (`POST /contratacoes`). */
export interface ContratacaoService {
  iniciada(payload: ContratacaoNotificacaoDto): Promise<void> | void;
}

/** Evento `contrato.averbado` — contrato entrou na folha. */
export interface ContratoService {
  averbado(payload: unknown): Promise<void> | void;
}

/** Evento `retencao.oportunidade.aberta` — Modo Defesa. */
export interface RetencaoService {
  oportunidadeAberta(payload: unknown): Promise<void> | void;
}

export type AverbacaoServices = {
  ofertas: OfertasService;
  contratacao?: ContratacaoService;
  contrato?: ContratoService;
  retencao?: RetencaoService;
};

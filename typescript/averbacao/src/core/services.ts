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

/**
 * O que o banco liga no plugin. Só `ofertas` é obrigatório.
 * Banco sem retenção não passa `retencao`.
 *
 * Modo Ataque não entra aqui: banco chama `POST /v1/reservas-compostas` na
 * Atlas. `adf.liberada` é evento interno (fila) do backend, que captura a
 * margem — não é notificação para o SDK.
 */
export type AverbacaoServices = {
  ofertas: OfertasService;
  contratacao?: ContratacaoService;
  contrato?: ContratoService;
  retencao?: RetencaoService;
};

import type { ContratacaoNotificacaoDto, OfertasRequestDto, OfertasResponseDto } from "./dto/index.js";

/**
 * Única peça que o banco implementa. O SDK dono do controller chama estes
 * métodos; o banco só liga o motor de crédito e os callbacks de domínio.
 */
export interface AverbacaoService {
  ofertas(request: OfertasRequestDto): Promise<OfertasResponseDto> | OfertasResponseDto;
  contratacaoIniciada?(payload: ContratacaoNotificacaoDto): Promise<void> | void;
  contratoAverbado?(payload: unknown): Promise<void> | void;
  adfLiberada?(payload: unknown): Promise<void> | void;
  retencaoOportunidade?(payload: unknown): Promise<void> | void;
}

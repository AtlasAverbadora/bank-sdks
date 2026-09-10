import {
  ContratacaoNotificacaoSchema,
  OfertasRequestSchema,
  OfertasResponseSchema,
  type ContratacaoNotificacaoDto,
  type OfertasResponseDto,
  type SaudeResponseDto,
} from "./dto/index.js";
import { signOferta } from "./crypto.js";
import type { AverbacaoService } from "./service.js";

export type AtlasAverbacaoConfig = {
  segredo: string | Buffer;
  versao?: number;
  /**
   * Quando informada, oferta sem `assinatura` é assinada aqui antes de
   * responder. Handler que já assina não é sobrescrito.
   */
  chavePrivada?: string | Buffer;
};

/**
 * Dono das rotas: valida DTO, chama o service do banco, assina ofertas.
 * Sem HTTP — o plugin Fastify só traduz request/reply para estes métodos.
 */
export class AverbacaoController {
  constructor(
    private readonly service: AverbacaoService,
    private readonly config: AtlasAverbacaoConfig,
  ) {}

  versao(): number {
    return this.config.versao ?? 1;
  }

  async ofertas(body: unknown): Promise<OfertasResponseDto> {
    const input = OfertasRequestSchema.parse(body);
    const response = OfertasResponseSchema.parse(await this.service.ofertas(input));
    if (!this.config.chavePrivada) return response;
    return {
      ...response,
      ofertas: response.ofertas.map((oferta) => {
        if (oferta.assinatura) return oferta;
        const { assinatura: _semAssinatura, ...unsigned } = oferta;
        return { ...unsigned, assinatura: signOferta(this.config.chavePrivada!, unsigned) };
      }),
    };
  }

  async contratacaoIniciada(body: unknown): Promise<{ ok: true }> {
    const payload: ContratacaoNotificacaoDto = ContratacaoNotificacaoSchema.parse(body);
    await this.service.contratacaoIniciada?.(payload);
    return { ok: true };
  }

  async evento(body: unknown): Promise<{ ok: true }> {
    const envelope = body as { tipo?: string; dados?: unknown };
    const handlers: Record<string, ((payload: unknown) => Promise<void> | void) | undefined> = {
      "contrato.averbado": this.service.contratoAverbado?.bind(this.service),
      "adf.liberada": this.service.adfLiberada?.bind(this.service),
      "retencao.oportunidade.aberta": this.service.retencaoOportunidade?.bind(this.service),
    };
    await handlers[envelope.tipo ?? ""]?.(envelope.dados);
    return { ok: true };
  }

  saude(): SaudeResponseDto {
    return { ok: true, sdk_version: this.versao() };
  }
}

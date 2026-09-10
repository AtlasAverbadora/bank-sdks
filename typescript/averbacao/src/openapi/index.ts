import { zodToJsonSchema } from "zod-to-json-schema";
import type { ZodTypeAny } from "zod";
import {
  ContratacaoNotificacaoSchema,
  EventoEnvelopeSchema,
  OfertaSchema,
  OfertasRequestSchema,
  OfertasResponseSchema,
  SaudeResponseSchema,
} from "../core/dto.js";

/**
 * OpenAPI das rotas que o BANCO precisa implementar (docs/07 §9: "OpenAPI
 * gerado dos mesmos schemas"), gerado a partir dos schemas Zod que o próprio
 * plugin Fastify usa para validar em runtime — não é um YAML escrito à mão que
 * diverge do código na primeira mudança de schema; é o schema, formatado
 * como JSON Schema.
 *
 * Mesmo precedente de `src/shared/openapi/zod-api-body.ts` (raiz do
 * monorepo): `zod-to-json-schema`, `target: "openApi3"`,
 * `$refStrategy: "none"` — inline tudo, sem `$ref` para um `definitions` que
 * este pacote não publica (o pacote não tem `components.schemas`
 * compartilhado entre gerações; cada rota já embute o schema inteiro).
 *
 * Mesmo detalhe conhecido do projeto: `zod-to-json-schema` infere o retorno
 * a partir do tipo estático do schema de entrada, e sob `ZodTypeAny` (a
 * união mais genérica) essa inferência estoura em profundidade (TS2589) —
 * o `tsc` recusa compilar. `zod-api-body.ts` resolve com `as any` na
 * ENTRADA (corta a inferência ali) seguido de cast tipado na SAÍDA; a mesma
 * técnica é aplicada aqui, pelo mesmo motivo.
 */
function jsonSchemaDe(schema: ZodTypeAny): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ver comentário acima e src/shared/openapi/zod-api-body.ts: `zod-to-json-schema` estoura TS2589 sob `ZodTypeAny`; o `as any` de entrada corta a inferência, e o retorno já é sempre JSON Schema (Record<string, unknown>).
  return zodToJsonSchema(schema as any, { target: "openApi3", $refStrategy: "none" }) as Record<string, unknown>;
}

const ASSINATURA_HEADER = {
  name: "Atlas-Signature",
  in: "header",
  required: true,
  schema: { type: "string", pattern: "^t=\\d+,v1=[0-9a-f]+$" },
  description: "HMAC-SHA256 sobre `timestamp.corpo` com o segredo do banco, janela de replay de 5 minutos (docs/07 §7).",
} as const;

const SDK_VERSION_HEADER_RESPONSE = {
  "Atlas-SDK-Version": {
    schema: { type: "integer" },
    description: "Versão do contrato em que esta resposta foi gerada (docs/07 §8).",
  },
} as const;

const ERRO_VALIDACAO_SCHEMA = {
  type: "object",
  properties: {
    code: { type: "string", enum: ["validation_error"] },
    detalhes: { type: "array", items: { type: "object" } },
  },
  required: ["code"],
} as const;

const ERRO_ASSINATURA_SCHEMA = {
  type: "object",
  properties: { code: { type: "string", enum: ["invalid_signature"] } },
  required: ["code"],
} as const;

export interface GerarOpenApiSpecOptions {
  /** `sdk_version` documentada — default 1 (docs/07 §8). */
  versao?: number;
  /** Título do documento — default cobre o contrato genérico do SDK. */
  titulo?: string;
}

/**
 * Gera o documento OpenAPI 3.0 das rotas que `@atlas/averbacao-sdk/fastify`
 * registra do lado do banco: `POST /ofertas`, `POST /contratacoes`,
 * `POST /eventos`, `GET /saude`. Puro — não depende de Nest nem de um
 * servidor rodando; é a mesma fonte (`index.ts`) que valida em runtime,
 * só formatada como documento.
 */
export function gerarOpenApiSpec(options: GerarOpenApiSpecOptions = {}): Record<string, unknown> {
  const versao = options.versao ?? 1;

  const ofertaSchema = jsonSchemaDe(OfertaSchema);
  const ofertasRequestSchema = jsonSchemaDe(OfertasRequestSchema);
  const ofertasResponseSchema = jsonSchemaDe(OfertasResponseSchema);
  const contratacaoSchema = jsonSchemaDe(ContratacaoNotificacaoSchema);
  const eventoSchema = jsonSchemaDe(EventoEnvelopeSchema);
  const saudeSchema = jsonSchemaDe(SaudeResponseSchema);

  return {
    openapi: "3.0.3",
    info: {
      title: options.titulo ?? "Contrato do banco — @atlas/averbacao-sdk",
      version: String(versao),
      description:
        "Rotas que um banco conveniado precisa implementar para integrar com a Atlas via @atlas/averbacao-sdk (docs/07-sdk-bancos.md). " +
        "Gerado a partir dos mesmos schemas Zod que `atlasAverbacao` valida em runtime — rode `npx atlas-sdk openapi` para regenerar após qualquer mudança de contrato.",
    },
    servers: [{ url: "{integracao_base_url}", description: "Base URL cadastrada em bancos.integracao_base_url", variables: { integracao_base_url: { default: "https://api.bancox.com.br/atlas/v1" } } }],
    paths: {
      "/ofertas": {
        post: {
          operationId: "postOfertas",
          summary: "Atlas pede ofertas de crédito para um servidor (docs/07 §4).",
          parameters: [ASSINATURA_HEADER],
          requestBody: { required: true, content: { "application/json": { schema: ofertasRequestSchema } } },
          responses: {
            "200": {
              description: "Lista de ofertas (pode ser vazia — recusa de crédito não é erro HTTP, docs/07 §4 regra 2).",
              headers: SDK_VERSION_HEADER_RESPONSE,
              content: { "application/json": { schema: ofertasResponseSchema } },
            },
            "400": { description: "Corpo fora do schema.", content: { "application/json": { schema: ERRO_VALIDACAO_SCHEMA } } },
            "401": { description: "Assinatura ausente, inválida ou fora da janela de replay de 5 minutos.", content: { "application/json": { schema: ERRO_ASSINATURA_SCHEMA } } },
          },
        },
      },
      "/contratacoes": {
        post: {
          operationId: "postContratacoes",
          summary: "Atlas notifica que uma oferta virou contrato (docs/07 §4.1).",
          parameters: [ASSINATURA_HEADER],
          requestBody: { required: true, content: { "application/json": { schema: contratacaoSchema } } },
          responses: {
            "200": { description: "Notificação recebida." },
            "401": { description: "Assinatura ausente, inválida ou fora da janela de replay.", content: { "application/json": { schema: ERRO_ASSINATURA_SCHEMA } } },
          },
        },
      },
      "/eventos": {
        post: {
          operationId: "postEventos",
          summary: "Atlas envia um evento de domínio (contrato.averbado, adf.liberada, retencao.oportunidade.aberta, …) — mesmo envelope de docs/06-eventos-filas.md §3.",
          parameters: [ASSINATURA_HEADER],
          requestBody: { required: true, content: { "application/json": { schema: eventoSchema } } },
          responses: {
            "200": { description: "Evento roteado por `tipo` para o callback correspondente." },
            "401": { description: "Assinatura ausente, inválida ou fora da janela de replay.", content: { "application/json": { schema: ERRO_ASSINATURA_SCHEMA } } },
          },
        },
      },
      "/saude": {
        get: {
          operationId: "getSaude",
          summary: "Sonda do circuit breaker da Atlas (docs/07 §4.1).",
          responses: {
            "200": { description: "Banco no ar, com a versão do SDK homologada.", content: { "application/json": { schema: saudeSchema } } },
          },
        },
      },
    },
    components: {
      schemas: {
        Oferta: ofertaSchema,
        OfertasRequest: ofertasRequestSchema,
        OfertasResponse: ofertasResponseSchema,
        ContratacaoNotificacao: contratacaoSchema,
        EventoEnvelope: eventoSchema,
        SaudeResponse: saudeSchema,
      },
    },
  };
}

export interface ValidacaoOpenApi {
  ok: boolean;
  erros: string[];
}

/**
 * Validação estrutural do documento gerado — não há validador de schema
 * OpenAPI completo nas dependências do monorepo (nem no root, nem neste
 * pacote), então em vez de instalar uma dependência nova só para isto, a
 * checagem cobre: (1) os campos que a especificação OpenAPI 3.0 exige em
 * cada nível (`openapi`, `info.title`, `info.version`, `paths`, cada
 * operação com `responses`, cada resposta com `description`); (2) que
 * nenhum fragmento de schema carrega `$ref` (provaria que o workaround de
 * `$refStrategy: "none"` vazou uma referência não resolvida — o mesmo risco
 * que o comentário de `zod-api-body.ts` evita); (3) que o documento inteiro
 * é JSON-serializável sem perda (`undefined`, `function`, `NaN` quebrariam
 * um consumidor real de OpenAPI, e não apareceriam num "o arquivo existe").
 */
export function validarOpenApiDocument(doc: unknown): ValidacaoOpenApi {
  const erros: string[] = [];
  const empurra = (condicao: boolean, mensagem: string) => {
    if (!condicao) erros.push(mensagem);
  };

  if (typeof doc !== "object" || doc === null) {
    return { ok: false, erros: ["documento não é um objeto"] };
  }
  const documento = doc as Record<string, unknown>;

  empurra(typeof documento.openapi === "string" && /^3\.\d+\.\d+$/.test(documento.openapi as string), "campo `openapi` ausente ou não é uma versão 3.x.x");

  const info = documento.info as Record<string, unknown> | undefined;
  empurra(typeof info === "object" && info !== null, "campo `info` ausente");
  if (info) {
    empurra(typeof info.title === "string" && info.title.length > 0, "`info.title` ausente ou vazio");
    empurra(typeof info.version === "string" && info.version.length > 0, "`info.version` ausente ou vazio");
  }

  const paths = documento.paths as Record<string, unknown> | undefined;
  empurra(typeof paths === "object" && paths !== null && Object.keys(paths).length > 0, "`paths` ausente ou vazio");
  if (paths) {
    for (const [rota, pathItem] of Object.entries(paths)) {
      empurra(rota.startsWith("/"), `rota \`${rota}\` não começa com "/"`);
      const operacoes = pathItem as Record<string, unknown>;
      const metodos = ["get", "post", "put", "patch", "delete"].filter((metodo) => metodo in operacoes);
      empurra(metodos.length > 0, `\`${rota}\` não declara nenhum método HTTP`);
      for (const metodo of metodos) {
        const operacao = operacoes[metodo] as Record<string, unknown>;
        const responses = operacao?.responses as Record<string, unknown> | undefined;
        empurra(typeof responses === "object" && responses !== null && Object.keys(responses).length > 0, `\`${metodo.toUpperCase()} ${rota}\` sem \`responses\``);
        if (responses) {
          for (const [codigo, resposta] of Object.entries(responses)) {
            empurra(/^([1-5]\d{2}|default)$/.test(codigo), `\`${metodo.toUpperCase()} ${rota}\` tem código de resposta inválido: "${codigo}"`);
            const descricao = (resposta as Record<string, unknown>)?.description;
            empurra(typeof descricao === "string" && descricao.length > 0, `\`${metodo.toUpperCase()} ${rota}\` → "${codigo}" sem \`description\``);
          }
        }
      }
    }
  }

  const refsSoltos = encontrarChave(documento, "$ref");
  empurra(refsSoltos.length === 0, `documento contém $ref não resolvido em: ${refsSoltos.join(", ")}`);

  try {
    const ida = JSON.stringify(documento);
    empurra(typeof ida === "string", "documento não serializa para JSON");
    const volta = JSON.parse(ida);
    empurra(JSON.stringify(volta) === ida, "documento perde informação num round-trip JSON.stringify/parse");
  } catch (error) {
    erros.push(`documento não é JSON-serializável: ${error instanceof Error ? error.message : String(error)}`);
  }

  return { ok: erros.length === 0, erros };
}

function encontrarChave(valor: unknown, chave: string, caminho = "$"): string[] {
  if (Array.isArray(valor)) {
    return valor.flatMap((item, index) => encontrarChave(item, chave, `${caminho}[${index}]`));
  }
  if (typeof valor === "object" && valor !== null) {
    const achados: string[] = [];
    for (const [k, v] of Object.entries(valor)) {
      if (k === chave) achados.push(`${caminho}.${k}`);
      achados.push(...encontrarChave(v, chave, `${caminho}.${k}`));
    }
    return achados;
  }
  return [];
}

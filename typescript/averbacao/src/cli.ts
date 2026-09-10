#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { signOferta, type OfertaDto } from "./index.js";
import { runVerify } from "./verify.js";
import { runSimulate, type SimulateRequestOverrides } from "./simulate.js";
import { gerarOpenApiSpec, validarOpenApiDocument } from "./openapi.js";

/**
 * `atlas-sdk` — CLI do pacote (docs/07-sdk-bancos.md §9). Quatro comandos
 * implementados de verdade:
 *
 *   atlas-sdk verify <url> [--segredo <hex|texto>] [--chave-publica <arquivo.pem>] [--timeout <ms>]
 *     Roda a bateria de conformidade contra a implementação do banco.
 *     `--segredo` default: env ATLAS_SIGNING_SECRET.
 *     `--chave-publica` default: env BANCO_PUBLIC_KEY_FILE (caminho de arquivo PEM).
 *
 *   atlas-sdk simulate <url> [--segredo ...] [--chave-publica ...] [--valor-desejado N]
 *                             [--prazo-desejado N] [--margem-disponivel N] [--margem-total N]
 *                             [--convenio-prazo-maximo N] [--convenio-taxa-teto N] [--timeout ms]
 *     Dispara UMA chamada real de /ofertas com os parâmetros informados e
 *     mostra request e response lado a lado, com as divergências
 *     encontradas — schema inválido, oferta fora dos tetos do convênio,
 *     assinatura ausente/inválida. Ferramenta de diagnóstico durante o
 *     desenvolvimento (ver `simulate.ts` para o desenho completo e por que
 *     não é `verify`); nunca falha por causa do corpo devolvido pelo banco —
 *     só por erro de transporte.
 *
 *   atlas-sdk openapi [--out <arquivo.json>] [--versao N]
 *     Gera o documento OpenAPI 3.0 das rotas que o banco precisa implementar
 *     (/ofertas, /contratacoes, /eventos, /saude), direto dos schemas Zod do
 *     pacote — sem YAML escrito à mão para divergir do código depois. Sem
 *     `--out`, imprime no stdout.
 *
 *   atlas-sdk sign <chave-privada.pem> <oferta.json>
 *     Assina uma oferta (sem `assinatura`) com a chave privada do banco — útil
 *     para inspecionar manualmente o que `atlasAverbacao` calcula por baixo.
 */

function parseFlags(args: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]!;
    if (arg.startsWith("--")) {
      const name = arg.slice(2);
      const value = args[i + 1];
      if (value === undefined || value.startsWith("--")) throw new Error(`Flag --${name} exige um valor.`);
      flags[name] = value;
      i += 1;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

async function runVerifyCommand(args: string[]): Promise<number> {
  const { positional, flags } = parseFlags(args);
  const url = positional[0];
  if (!url) {
    console.error("Uso: atlas-sdk verify <url> [--segredo <segredo>] [--chave-publica <arquivo.pem>] [--timeout <ms>]");
    return 2;
  }
  const segredo = flags.segredo ?? process.env.ATLAS_SIGNING_SECRET;
  if (!segredo) {
    console.error("Segredo HMAC não informado. Use --segredo ou defina ATLAS_SIGNING_SECRET.");
    return 2;
  }
  const chavePublicaArquivo = flags["chave-publica"] ?? process.env.BANCO_PUBLIC_KEY_FILE;
  const chavePublica = chavePublicaArquivo ? readFileSync(chavePublicaArquivo, "utf8") : undefined;
  const timeoutMs = flags.timeout ? Number(flags.timeout) : undefined;

  const resultado = await runVerify(url, { segredo, chavePublica, timeoutMs });

  for (const check of resultado.checks) {
    const marca = check.ok ? "OK  " : "FAIL";
    console.log(`[${marca}] ${check.nome}${check.detalhe ? ` — ${check.detalhe}` : ""}`);
  }
  console.log("");
  console.log(
    resultado.ok
      ? `Conforme. Versão homologável: sdk_version=${resultado.sdkVersion ?? "?"}.`
      : `Não conforme — corrija as checagens marcadas FAIL antes de pedir homologação.`,
  );
  console.log(JSON.stringify(resultado));
  return resultado.ok ? 0 : 1;
}

function pad(linhas: string[], largura: number): string[] {
  return linhas.map((linha) => (linha.length > largura ? linha.slice(0, largura - 1) + "…" : linha.padEnd(largura)));
}

/** Renderiza duas colunas de texto lado a lado — usado para request/response de `simulate`. */
function ladoALado(tituloEsquerda: string, esquerda: string, tituloDireita: string, direita: string, largura = 58): string {
  const linhasE = pad([tituloEsquerda, "-".repeat(tituloEsquerda.length), ...esquerda.split("\n")], largura);
  const linhasD = pad([tituloDireita, "-".repeat(tituloDireita.length), ...direita.split("\n")], largura);
  const total = Math.max(linhasE.length, linhasD.length);
  const saida: string[] = [];
  for (let i = 0; i < total; i += 1) {
    saida.push(`${linhasE[i] ?? " ".repeat(largura)}  |  ${linhasD[i] ?? ""}`);
  }
  return saida.join("\n");
}

async function runSimulateCommand(args: string[]): Promise<number> {
  const { positional, flags } = parseFlags(args);
  const url = positional[0];
  if (!url) {
    console.error(
      "Uso: atlas-sdk simulate <url> [--segredo <segredo>] [--chave-publica <arquivo.pem>] " +
        "[--valor-desejado N] [--prazo-desejado N] [--margem-disponivel N] [--margem-total N] " +
        "[--convenio-prazo-maximo N] [--convenio-taxa-teto N] [--timeout <ms>]",
    );
    return 2;
  }
  const segredo = flags.segredo ?? process.env.ATLAS_SIGNING_SECRET;
  if (!segredo) {
    console.error("Segredo HMAC não informado. Use --segredo ou defina ATLAS_SIGNING_SECRET.");
    return 2;
  }
  const chavePublicaArquivo = flags["chave-publica"] ?? process.env.BANCO_PUBLIC_KEY_FILE;
  const chavePublica = chavePublicaArquivo ? readFileSync(chavePublicaArquivo, "utf8") : undefined;
  const timeoutMs = flags.timeout ? Number(flags.timeout) : undefined;
  const numero = (nome: string): number | undefined => (flags[nome] !== undefined ? Number(flags[nome]) : undefined);

  const request: SimulateRequestOverrides = {
    valorDesejado: numero("valor-desejado") ?? null,
    prazoDesejado: numero("prazo-desejado") ?? null,
    margemDisponivel: numero("margem-disponivel"),
    margemTotal: numero("margem-total"),
    convenioPrazoMaximoMeses: numero("convenio-prazo-maximo"),
    convenioTaxaTetoAm: numero("convenio-taxa-teto"),
    convenioCodigo: flags["convenio-codigo"],
    matricula: flags.matricula,
    cpf: flags.cpf,
  };

  const resultado = await runSimulate(url, { segredo, chavePublica, timeoutMs, request });

  if (resultado.erroTransporte) {
    console.error(`Falha ao chamar ${url}/ofertas: ${resultado.erroTransporte}`);
    return 1;
  }

  console.log(
    ladoALado(
      "REQUEST (o que a Atlas manda)",
      JSON.stringify(resultado.request, null, 2),
      `RESPONSE (HTTP ${resultado.status}, Atlas-SDK-Version=${resultado.sdkVersionHeader ?? "?"})`,
      JSON.stringify(resultado.responseBody, null, 2),
    ),
  );
  console.log("");
  if (resultado.divergencias.length === 0) {
    console.log("Nenhuma divergência encontrada.");
  } else {
    console.log(`${resultado.divergencias.length} divergência(s):`);
    for (const divergencia of resultado.divergencias) {
      const marca = divergencia.severidade === "erro" ? "ERRO" : "AVISO";
      console.log(`  [${marca}] ${divergencia.campo}: ${divergencia.detalhe}`);
    }
  }
  return 0;
}

async function runOpenApiCommand(args: string[]): Promise<number> {
  const { flags } = parseFlags(args);
  const versao = flags.versao ? Number(flags.versao) : undefined;
  const documento = gerarOpenApiSpec({ versao });
  const validacao = validarOpenApiDocument(documento);
  if (!validacao.ok) {
    console.error("Documento OpenAPI gerado é inválido (bug no gerador, não no seu banco):");
    for (const erro of validacao.erros) console.error(`  - ${erro}`);
    return 1;
  }
  const json = JSON.stringify(documento, null, 2);
  if (flags.out) {
    writeFileSync(flags.out, json + "\n", "utf8");
    console.error(`OpenAPI escrito em ${flags.out}`);
  } else {
    console.log(json);
  }
  return 0;
}

async function runSignCommand(args: string[]): Promise<number> {
  const [chavePrivadaPath, ofertaPath] = args;
  if (!chavePrivadaPath || !ofertaPath) {
    console.error("Uso: atlas-sdk sign <chave-privada.pem> <oferta.json>");
    return 2;
  }
  const chavePrivada = readFileSync(chavePrivadaPath, "utf8");
  const oferta = JSON.parse(readFileSync(ofertaPath, "utf8")) as Omit<OfertaDto, "assinatura">;
  const assinatura = signOferta(chavePrivada, oferta);
  console.log(assinatura);
  return 0;
}

async function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2);
  switch (command) {
    case "verify":
      return runVerifyCommand(rest);
    case "simulate":
      return runSimulateCommand(rest);
    case "openapi":
      return runOpenApiCommand(rest);
    case "sign":
      return runSignCommand(rest);
    default:
      console.error("Uso: atlas-sdk <verify|simulate|openapi|sign> ...");
      return 2;
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });

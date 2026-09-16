using Atlas.Averbacao.Api;
using Atlas.Averbacao.Api.Ofertas;

namespace Atlas.Averbacao.Services.Ofertas;

/**
 * Motor de crédito. Sem este método a integração não homologa.
 *
 * Use request (CPF, matrícula, margem, tetos do convênio) para consultar
 * o seu sistema. Devolva as parcelas que cabem na margem e nos tetos.
 * Sem oferta: ofertas = [] — nunca lance erro por recusa de crédito.
 * Não preencha jws; o adaptador assina.
 */
public class OfertasService : IOfertasService
{
    public Task<OfertasResponse> Gerar(OfertasRequest request)
    {
        // var simulacao = await suaApi.Simular(request.Servidor.Cpf, request.Margem.Disponivel);
        // if (!simulacao.Aprovado) return new OfertasResponse { Ofertas = [] };
        _ = request;
        throw new NotImplementedProblem("ofertas.gerar");
    }
}

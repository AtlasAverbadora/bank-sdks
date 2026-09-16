using Atlas.Averbacao.Api.Retencao;

namespace Atlas.Averbacao.Services.Retencao;

/**
 * Modo Defesa: o servidor pode ser retido. Use request.OportunidadeId
 * e request.ExpiraEm para disparar a sua campanha / contraoferta.
 *
 * Sem Modo Defesa, deixe o método como está.
 */
public class RetencaoService : IRetencaoService
{
    public Task OportunidadeAberta(RetencaoOportunidadeRequest request)
    {
        // await suaApi.AbrirRetencao(request.OportunidadeId, request.ExpiraEm);
        _ = request;
        return Task.CompletedTask;
    }
}

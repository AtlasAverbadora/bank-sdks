using Atlas.Averbacao.Api.Contratacao;

namespace Atlas.Averbacao.Services.Contratacao;

/**
 * O servidor escolheu uma oferta sua. Use request.OfertaId e
 * request.CorrelacaoId para reservar/confirmar no seu core.
 *
 * Se você não precisa desse aviso, deixe o método como está.
 */
public class ContratacaoService : IContratacaoService
{
    public Task Iniciada(ContratacaoRequest request)
    {
        // await suaApi.ConfirmarProposta(request.OfertaId);
        _ = request;
        return Task.CompletedTask;
    }
}

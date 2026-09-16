using Atlas.Averbacao.Api.Contrato;

namespace Atlas.Averbacao.Services.Contrato;

/**
 * O contrato entrou na folha. Use request.ContratoId (e Adf, se vier)
 * para marcar o empréstimo como averbado no seu core.
 *
 * Se você não precisa desse aviso, deixe o método como está.
 */
public class ContratoService : IContratoService
{
    public Task Averbado(ContratoAverbadoRequest request)
    {
        // await suaApi.MarcarAverbado(request.ContratoId);
        _ = request;
        return Task.CompletedTask;
    }
}

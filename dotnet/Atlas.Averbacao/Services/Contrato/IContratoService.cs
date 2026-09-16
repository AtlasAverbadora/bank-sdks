using Atlas.Averbacao.Api.Contrato;

namespace Atlas.Averbacao.Services.Contrato;

public interface IContratoService
{
    Task Averbado(ContratoAverbadoRequest request);
}

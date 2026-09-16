using Atlas.Averbacao.Api.Contratacao;

namespace Atlas.Averbacao.Services.Contratacao;

public interface IContratacaoService
{
    Task Iniciada(ContratacaoRequest request);
}

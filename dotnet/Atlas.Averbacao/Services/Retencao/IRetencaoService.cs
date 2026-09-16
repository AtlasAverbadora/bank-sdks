using Atlas.Averbacao.Api.Retencao;

namespace Atlas.Averbacao.Services.Retencao;

public interface IRetencaoService
{
    Task OportunidadeAberta(RetencaoOportunidadeRequest request);
}

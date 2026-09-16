using Atlas.Averbacao.Api.Ofertas;

namespace Atlas.Averbacao.Services.Ofertas;

public interface IOfertasService
{
    Task<OfertasResponse> Gerar(OfertasRequest request);
}

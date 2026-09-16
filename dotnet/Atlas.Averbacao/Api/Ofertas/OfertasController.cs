using Atlas.Averbacao.Api.Ofertas;
using Atlas.Averbacao.Security;
using Atlas.Averbacao.Services.Ofertas;
using Microsoft.AspNetCore.Mvc;

namespace Atlas.Averbacao.Api.Ofertas;

[ApiController]
[Route("v1/ofertas")]
public sealed class OfertasController(IOfertasService ofertas, IdentityState identity) : ControllerBase
{
    /// <summary>Devolva ofertas de crédito para o servidor informado.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(OfertasResponse), 200)]
    public async Task<OfertasResponse> Post([FromBody] OfertasRequest request)
    {
        var gerada = await ofertas.Gerar(request);
        if (gerada.ValidadeSegundos <= 0) gerada.ValidadeSegundos = 300;
        if (identity.Current is null) return gerada;
        foreach (var oferta in gerada.Ofertas)
        {
            if (!string.IsNullOrEmpty(oferta.Jws)) continue;
            var unsigned = new OfertaUnsigned
            {
                ReferenciaBanco = oferta.ReferenciaBanco,
                ValorFinanciado = oferta.ValorFinanciado,
                ValorLiquido = oferta.ValorLiquido,
                ValorParcela = oferta.ValorParcela,
                PrazoMeses = oferta.PrazoMeses,
                TaxaAm = oferta.TaxaAm,
                CetAm = oferta.CetAm,
                ValorIof = oferta.ValorIof,
            };
            oferta.Jws = HttpSignatures.SignOfertaJws(identity.Current.BancoPrivateKey, unsigned);
        }
        return gerada;
    }
}
